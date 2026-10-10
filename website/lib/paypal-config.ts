const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

/**
 * Server-side PayPal settings. PayPal is a temporary bridge until Paddle is
 * approved; the pricing page only offers it while Paddle has no keys.
 */
export const PAYPAL_CONFIG = {
  clientId,
  clientSecret,
  // Sandbox REST client ids start with "sb"; set PAYPAL_API_URL to override.
  apiUrl:
    process.env.PAYPAL_API_URL ||
    (clientId.startsWith("sb") ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"),
  webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
};

export const isPayPalServerConfigured = () =>
  Boolean(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret);
