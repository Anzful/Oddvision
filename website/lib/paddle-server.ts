import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

let client: Paddle | null = null;

/**
 * Server-only Paddle API client. The environment follows the API key prefix
 * (`pdl_live_` = production, `pdl_sdbx_` = sandbox), so a sandbox key can
 * never be pointed at the live API or vice versa.
 */
export function getPaddle(): Paddle {
  if (client) return client;
  const apiKey = process.env.PADDLE_API_KEY?.trim();
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");
  if (!/^pdl_(live|sdbx)_/.test(apiKey)) throw new Error("Unsupported Paddle API key format");
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (token && (!/^(live|test)_/.test(token) || token.startsWith("live_") !== apiKey.startsWith("pdl_live_"))) {
    throw new Error("Paddle client token and API key environments do not match");
  }
  client = new Paddle(apiKey, {
    environment: apiKey.startsWith("pdl_live_")
      ? Environment.production
      : Environment.sandbox,
    logLevel: LogLevel.error,
  });
  return client;
}
