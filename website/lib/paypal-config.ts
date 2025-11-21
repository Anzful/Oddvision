export const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  apiUrl: process.env.PAYPAL_API_URL || "https://api-m.paypal.com"
};

if (!PAYPAL_CONFIG.clientId || !PAYPAL_CONFIG.clientSecret) {
  console.error("❌ Missing PayPal Environment Variables");
}
