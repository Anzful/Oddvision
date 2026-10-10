import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

let client: Paddle | null = null;

/**
 * Server-only Paddle API client. The environment follows the API key prefix
 * (`pdl_live_` = production, anything else = sandbox), so a sandbox key can
 * never be pointed at the live API or vice versa.
 */
export function getPaddle(): Paddle {
  if (client) return client;
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");
  client = new Paddle(apiKey, {
    environment: apiKey.startsWith("pdl_live_")
      ? Environment.production
      : Environment.sandbox,
    logLevel: LogLevel.error,
  });
  return client;
}
