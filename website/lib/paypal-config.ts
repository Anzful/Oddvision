const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

export const PAYPAL_CONFIG = {
  clientId,
  clientSecret,
  // Automatically switch URL based on the Key prefix
  // Sandbox keys always start with "sb-"
  apiUrl: process.env.PAYPAL_API_URL || (clientId?.startsWith("sb") ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"),
  webhookId: process.env.PAYPAL_WEBHOOK_ID!,
};

if (!PAYPAL_CONFIG.clientId || !PAYPAL_CONFIG.clientSecret) {
  console.error("❌ Missing PayPal Environment Variables");
}
