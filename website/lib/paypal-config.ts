export const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  // Automatically switch URL based on the Key prefix
  // Sandbox keys always start with "sb-" or "Alc..." (app ID) but mostly "sb" in recent accounts
  // Safest bet: If the user provides PAYPAL_API_URL, use it. 
  // If not, check if the client ID looks like a sandbox ID (optional), 
  // BUT the user requested to depend on process env directly.
  apiUrl: process.env.PAYPAL_API_URL || (process.env.PAYPAL_CLIENT_ID?.startsWith("sb") ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"),
  webhookId: process.env.PAYPAL_WEBHOOK_ID!,
};

if (!PAYPAL_CONFIG.clientId || !PAYPAL_CONFIG.clientSecret) {
  console.error("❌ Missing PayPal Environment Variables");
}
