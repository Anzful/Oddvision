import { PAYPAL_CONFIG } from "./paypal-config";

/**
 * Generates an access token using Client Credentials
 */
export async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PayPal access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Verifies a Webhook Signature using the PayPal API
 */
export async function verifyPayPalWebhookSignature(
  req: Request,
  bodyText: string
): Promise<boolean> {
  const headers = req.headers;
  
  // Get required headers
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("Missing PayPal Webhook Headers");
    return false;
  }

  const accessToken = await getPayPalAccessToken();

  const verifyResponse = await fetch(
    `${PAYPAL_CONFIG.apiUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: PAYPAL_CONFIG.webhookId,
        webhook_event: JSON.parse(bodyText),
      }),
    }
  );

  const verificationResult = await verifyResponse.json();
  
  if (verificationResult.verification_status === "SUCCESS") {
    return true;
  }

  console.error("PayPal Signature Verification Failed:", verificationResult);
  return false;
}

