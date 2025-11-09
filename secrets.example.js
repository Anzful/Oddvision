// Oddvision Secrets Template
// Copy this file to 'secrets.js' and add your API keys
// Automatic failover: If one fails, the next one is used automatically!

var OddvisionConfig = {
  // PRIMARY: Groq (30 requests/min, 14,400/day) - FASTEST ⚡
  // Get key from: https://console.groq.com/keys
  apiKey: 'YOUR_GROQ_KEY_HERE',
  
  // BACKUP: OpenRouter (200 requests/day, 20 req/min on free models) 🆓
  // Get key from: https://openrouter.ai/keys
  openrouterKey: 'YOUR_OPENROUTER_KEY_HERE'
};
