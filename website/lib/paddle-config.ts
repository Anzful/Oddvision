/**
 * Public (browser-safe) Paddle settings. The environment is derived from the
 * client-side token prefix (`test_` = sandbox, `live_` = production) so the
 * checkout can never run against the wrong environment by accident.
 */
const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ?? "";

export const PADDLE_PUBLIC = {
  clientToken,
  priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID?.trim() ?? "",
  environment: (clientToken.startsWith("live_") ? "production" : "sandbox") as
    | "production"
    | "sandbox",
};

export const isPaddleConfigured = () =>
  /^(test|live)_[a-zA-Z0-9]+$/.test(PADDLE_PUBLIC.clientToken) && /^pri_[a-z0-9]+$/.test(PADDLE_PUBLIC.priceId);
