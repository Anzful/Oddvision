-- Stop users from granting themselves Pro when they create their own usage row.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- Before: "Users can insert own user_usage" only checked auth.uid() = user_id,
-- so a new account could insert its row with is_pro = true and no expiry
-- (permanent free Pro), or a negative prompts_count (extra free prompts).
-- After: users can still create their own row, but only with Free-plan values.
-- Founders (separate policy), toggle_user_pro_status (security definer) and the
-- website's server code (service role) are unaffected.

begin;

drop policy if exists "Users can insert own user_usage" on public.user_usage;

create policy "Users can insert own user_usage"
  on public.user_usage
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and coalesce(is_pro, false) = false
    and pro_expires_at is null
    and pro_granted_by is null
    and paddle_customer_id is null
    and paddle_subscription_id is null
    and subscription_status is null
    and next_billing_date is null
    and subscription_cancel_at is null
    and paddle_updated_at is null
    and paypal_subscription_id is null
    and coalesce(prompts_count, 0) >= 0
    and coalesce(total_prompts, 0) >= 0
  );

-- Recommended hardening: pin search_path on the security-definer admin
-- functions so they can't be pointed at look-alike objects in other schemas.
alter function public.get_admin_stats_detailed() set search_path = public;
alter function public.get_all_users_for_admin() set search_path = public;
alter function public.get_chart_data(timestamptz, timestamptz) set search_path = public;
alter function public.get_users_table_data(date[]) set search_path = public;
alter function public.toggle_user_pro_status(uuid, boolean, integer) set search_path = public;

commit;
