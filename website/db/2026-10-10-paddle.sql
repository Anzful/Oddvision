-- Paddle billing columns on user_usage.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- The extension and website keep reading is_pro / pro_expires_at exactly as
-- before; these columns let the server link a user to their Paddle
-- subscription, open the billing portal, and show renewal/cancellation dates.

alter table public.user_usage
  add column if not exists paddle_customer_id      text,
  add column if not exists paddle_subscription_id  text,
  add column if not exists subscription_status     text,         -- active | trialing | past_due | paused | canceled
  add column if not exists next_billing_date       timestamptz,
  add column if not exists subscription_cancel_at  timestamptz,  -- set when canceled at period end
  add column if not exists paddle_updated_at       timestamptz;  -- Paddle's updated_at, guards against stale writes

create index if not exists user_usage_paddle_subscription_id_idx
  on public.user_usage (paddle_subscription_id);

create index if not exists user_usage_paddle_customer_id_idx
  on public.user_usage (paddle_customer_id);
