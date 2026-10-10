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
