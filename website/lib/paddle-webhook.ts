import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Paddle Billing webhook signature.
 *
 * Header format: `ts=1671552777;h1=<hex>` (several `h1` values may be present
 * while Paddle rotates secrets). The signed payload is `${ts}:${rawBody}`,
 * hashed with HMAC-SHA256 using the notification destination's secret key.
 *
 * `toleranceSeconds` rejects replays of old events. The official SDK uses 5s;
 * we allow a little more to absorb serverless cold starts and clock skew.
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret) return false;

  let ts: number | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(";")) {
    const [key, value] = part.split("=", 2).map((s) => s?.trim());
    if (key === "ts" && value && /^\d+$/.test(value)) ts = Number(value);
    if (key === "h1" && value) signatures.push(value);
  }
  if (ts === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  return signatures.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** True when `ip` (IPv4, or IPv4-mapped IPv6) falls inside one of the IPv4 CIDRs. */
export function ipInCidrs(ip: string, cidrs: string[]): boolean {
  const toInt = (addr: string) => {
    const parts = addr.split(".");
    if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null;
    return parts.reduce((n, p) => n * 256 + Number(p), 0);
  };
  const addr = toInt(ip.trim().replace(/^::ffff:/i, ""));
  if (addr === null) return false;
  return cidrs.some((cidr) => {
    const [base, bitsText = "32"] = cidr.split("/");
    const start = toInt(base);
    const bits = Number(bitsText);
    if (start === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const size = 2 ** (32 - bits);
    return Math.floor(addr / size) === Math.floor(start / size);
  });
}

const IPS_TTL_MS = 60 * 60 * 1000;
let ipsCache: { cidrs: string[]; fetchedAt: number } | null = null;

/**
 * Paddle's current webhook source IPs, from its `/ips` endpoint (the source of
 * truth, so the list is never hard-coded). The environment follows the API key
 * prefix, like the API client. Cached for an hour; a failed refresh keeps the
 * last good list, and `null` means no list could be loaded at all.
 */
export async function getPaddleWebhookCidrs(): Promise<string[] | null> {
  if (ipsCache && Date.now() - ipsCache.fetchedAt < IPS_TTL_MS) return ipsCache.cidrs;
  const host = process.env.PADDLE_API_KEY?.startsWith("pdl_live_")
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
  try {
    const res = await fetch(`${host}/ips`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cidrs = (await res.json())?.data?.ipv4_cidrs;
    if (!Array.isArray(cidrs) || cidrs.length === 0) throw new Error("no ipv4_cidrs in response");
    ipsCache = { cidrs, fetchedAt: Date.now() };
  } catch (err) {
    console.error("[paddle/webhook] could not load Paddle IPs", err);
  }
  return ipsCache?.cidrs ?? null;
}
