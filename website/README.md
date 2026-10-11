# Oddvision website and Paddle billing

Run commands from `website/` using Node 22 or newer:

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Copy `.env.example` to `.env.local` for local development. Public Supabase variables are required to build. The production build embeds `NEXT_PUBLIC_*` values: redeploy after changing them. Both npm and Bun lockfiles are committed; update both when changing dependencies.

## Deployment configuration

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: use the same Supabase project as the extension's `config.js`.
- `SUPABASE_SERVICE_ROLE_KEY`: server only, from that same project.
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`: `test_...` for sandbox or `live_...` for production.
- `NEXT_PUBLIC_PADDLE_PRICE_ID`: the active recurring Oddvision Pro price. Confirm USD 8.00 per month with tax added in Paddle. The displayed price is static; Paddle determines the charge.
- `PADDLE_API_KEY`: a current `pdl_sdbx_...` or `pdl_live_...` key matching the client token. Requires transaction read, subscription read, and customer portal session write permissions.
- `PADDLE_PRO_PRICE_IDS`: optional comma-separated historical Pro prices for new links. Existing linked subscriptions remain eligible after a price change.
- `PADDLE_WEBHOOK_SECRET`: endpoint secret for the notification destination in the same Paddle environment.
- `CRON_SECRET`: a strong server-only secret for Vercel's daily reconciliation job.

Apply `db/2026-10-10-paddle.sql` to the correct Supabase project before deploying. Billing writes use the service role. In Supabase, verify `user_usage` has RLS enabled; ordinary authenticated users may read their own row but **must not** be able to insert/update billing or Pro fields. Review all callable RPCs that grant Pro, including `toggle_user_pro_status`: founder authorization must be enforced on the server. The extension's client-side founder list is not authorization. The schema file adds columns and indexes; it does not configure these existing policies or RPCs.

## Paddle dashboard

1. Use an approved website domain and configure its default payment link to the pricing page.
2. Add a live notification destination at `https://oddvision.xyz/api/paddle/webhook` and enable at least `subscription.created`, `subscription.updated`, and `transaction.completed`. Subscription lifecycle events (`activated`, `canceled`, `past_due`, `paused`, `resumed`, `trialing`) can also be enabled.
3. Copy that destination's secret to the deployment's `PADDLE_WEBHOOK_SECRET` and redeploy. Check delivery logs for successful real subscription events. Simulator IDs may not exist in the API; a simulator acknowledgement alone does not prove provisioning works.
4. Enable/configure the customer portal and verify the API key can create a session. Confirm renewal failure handling and cancellation settings in Paddle Retain. Track API-key expiry.
5. Confirm Vercel has registered `/api/cron/downgrade-expired` from `vercel.json` and that scheduled invocations succeed.

Webhook signatures are checked on the raw body before processing. On Vercel, callers must also match Paddle's published IP list. Each event re-fetches the subscription. Database writes compare the saved version and access fields atomically, retrying concurrent changes without overwriting newer updates or manual grants.

Active/trialing subscriptions receive access through the period end plus three days. Past-due subscriptions keep a rolling three-day grace window while Paddle retries; the daily reconciliation refreshes it. Scheduled cancellation/pause stops access at its effective timestamp. Canceled/paused subscriptions lose access immediately. Founder grants are preserved. Daily reconciliation covers all linked subscriptions, including free accounts after a missed renewal/resume event. This job makes one Paddle API call per linked row; move to a queued/batched reconciliation worker before its runtime approaches Vercel's 60-second function limit.

Full refunds and cancellation are separate operations: support must cancel the subscription when granting a refund under the refund policy.

## End-to-end release check (sandbox)

1. Sign in as a non-founder user, complete a sandbox checkout, and confirm Pro on the site, in `user_usage`, and in the extension's AI request limit enforcement.
2. Close/reload the page immediately after paying. Verify the webhook still grants access, and returning to the same tab resumes pending activation.
3. Replay a subscription notification, deliver older events afterward, and verify the newest state remains.
4. Schedule cancellation and pause; confirm access before the effective time and loss afterward. Resume a paused subscription and check access returns.
5. Simulate renewal success and payment failure. Confirm dates update, the failure banner appears, and billing management remains available even after cached access expires.
6. Open the customer portal to update a payment method, view invoices, and cancel. Verify it never opens another user's subscription.
7. Invoke the cron with its secret and check recovery after suppressing a renewal webhook. Requests without the secret must fail.
8. As an ordinary authenticated user, attempt to edit Pro/billing fields on your own row and invoke the founder RPC. Both must be denied.

The automated suite tests access mapping, webhook validation, authentication/ownership, conditional database writes under races, reconciliation pagination, and client read failures. It mocks Paddle and the Supabase HTTP boundary; it does not replace a sandbox payment, a live RLS audit, or deployment-secret verification.
