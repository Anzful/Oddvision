import { PAYPAL_CONFIG } from "./paypal-config";

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth client-credentials token, cached until shortly before it expires. */
export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 0) * 1000 };
  return data.access_token;
}

export type PayPalSubscription = {
  id: string;
  status: string; // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
  custom_id?: string;
  plan_id?: string;
  billing_info?: { next_billing_time?: string };
};

/** Fetches a subscription's current state from PayPal; null if it doesn't exist. */
export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscription | null> {
  const token = await getPayPalAccessToken();
  const response = await fetch(
    `${PAYPAL_CONFIG.apiUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PayPal subscription lookup failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Verifies a webhook with PayPal's verify-webhook-signature API.
 *
 * The event is embedded as the RAW request text rather than re-serialized
 * JSON: re-encoding a parsed event can change it (key order, number format),
 * which makes PayPal report a mismatch for a genuine delivery.
 */
export async function verifyPayPalWebhookSignature(req: Request, rawBody: string): Promise<boolean> {
  const headers = req.headers;
  const fields: Record<string, string | null> = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: PAYPAL_CONFIG.webhookId || null,
  };
  const missing = Object.entries(fields).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn("[paypal/webhook] missing signature fields:", missing.join(", "));
    return false;
  }

  const token = await getPayPalAccessToken();
  const prefix = Object.entries(fields).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",");
  const response = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: `{${prefix},"webhook_event":${rawBody}}`,
  });
  if (!response.ok) {
    console.error("[paypal/webhook] verification request failed:", response.status, await response.text());
    return false;
  }
  const result = await response.json();
  return result.verification_status === "SUCCESS";
}
