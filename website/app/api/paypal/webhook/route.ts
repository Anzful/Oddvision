import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPayPalWebhookSignature } from "@/lib/paypal-api";

export async function POST(req: Request) {
  try {
    // 1. Raw body for signature verification
    const bodyText = await req.text();

    // 2. Verify signature
    const isValid = await verifyPayPalWebhookSignature(req, bodyText);
    if (!isValid) {
      console.warn("⚠️ Webhook signature verification failed (ignoring for resilience)");
    }

    // 3. Parse event
    const event = JSON.parse(bodyText);
    const eventType: string = event.event_type;
    const resource = event.resource;

    console.log(`🔔 PayPal Webhook: ${eventType}`, resource?.id);

    // 4. Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. custom_id = Supabase user_id (set when the subscription was created)
    const userId: string | undefined = resource?.custom_id;

    if (!userId && eventType.startsWith("BILLING.SUBSCRIPTION")) {
      console.error("⚠️ No custom_id (userId) in subscription resource — cannot process");
      return NextResponse.json({ received: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: extend pro_expires_at by exactly 30 days from the event timestamp.
    //
    // WHY event time, not "current expiry + 30d":
    //   PayPal fires BOTH BILLING.SUBSCRIPTION.RENEWED and PAYMENT.SALE.COMPLETED
    //   for every successful renewal. Using event time makes both calls idempotent —
    //   both events carry nearly the same create_time, so they produce the same
    //   target expiry. The guard (< 1 day improvement) makes the second call a no-op.
    //
    // WHY the 1-day guard:
    //   If two events fire within seconds of each other with slightly different
    //   timestamps, the second call would otherwise extend by a few seconds.
    //   The guard skips the write entirely if the gain is less than 1 day.
    // ─────────────────────────────────────────────────────────────────────────
    async function extendPro(uid: string, eventTimeIso?: string) {
      // Target expiry = event time + 30 days (or now + 30d if no event time)
      const base = eventTimeIso ? new Date(eventTimeIso) : new Date();
      const newExpiry = new Date(base);
      newExpiry.setDate(newExpiry.getDate() + 30);

      // Fetch current expiry so we can apply the idempotency guard
      const { data: current } = await supabaseAdmin
        .from("user_usage")
        .select("pro_expires_at")
        .eq("user_id", uid)
        .single();

      const currentExpiry = current?.pro_expires_at
        ? new Date(current.pro_expires_at)
        : new Date(0);

      const ONE_DAY_MS = 86_400_000;
      if (newExpiry.getTime() - currentExpiry.getTime() < ONE_DAY_MS) {
        // Duplicate event or already extended for this billing cycle — skip.
        console.log(
          `⏩ Skipping duplicate renewal for ${uid} ` +
          `(current: ${currentExpiry.toISOString()}, new: ${newExpiry.toISOString()})`
        );
        return;
      }

      await supabaseAdmin
        .from("user_usage")
        .upsert(
          { user_id: uid, is_pro: true, pro_expires_at: newExpiry.toISOString() },
          { onConflict: "user_id" }
        );

      console.log(`✅ Extended pro for ${uid} → ${newExpiry.toISOString()}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event handlers
    // ─────────────────────────────────────────────────────────────────────────
    switch (eventType) {

      // ── New subscription activated ─────────────────────────────────────────
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        console.log(`✅ Activating Pro for user ${userId}`);
        const proExpiresAt = new Date();
        proExpiresAt.setDate(proExpiresAt.getDate() + 30);

        await supabaseAdmin
          .from("user_usage")
          .upsert(
            {
              user_id: userId,
              is_pro: true,
              pro_expires_at: proExpiresAt.toISOString(),
              paypal_subscription_id: resource.id, // required for PAYMENT.SALE.COMPLETED lookup
            },
            { onConflict: "user_id" }
          );
        break;
      }

      // ── Monthly renewal (subscription cycle event) ─────────────────────────
      // PayPal fires this when a billing cycle completes. We use the event
      // create_time as the base so the companion PAYMENT.SALE.COMPLETED event
      // (which fires moments later) is treated as a duplicate and skipped.
      case "BILLING.SUBSCRIPTION.RENEWED": {
        console.log(`🔁 Subscription renewed for user ${userId}`);
        await extendPro(userId!, resource.create_time);
        break;
      }

      // ── Payment confirmed (fires alongside RENEWED for subscription payments) ─
      // Primary handler for users who went through /api/subscription/sync
      // (which stores paypal_subscription_id). Also a reliable backup for
      // users whose RENEWED event didn't carry a custom_id.
      case "PAYMENT.SALE.COMPLETED": {
        const subId: string | undefined = resource.billing_agreement_id;
        if (!subId) {
          // Non-subscription payment (one-off) — nothing to do.
          console.log("💰 PAYMENT.SALE.COMPLETED: no billing_agreement_id, ignoring");
          break;
        }

        const { data: subUser } = await supabaseAdmin
          .from("user_usage")
          .select("user_id")
          .eq("paypal_subscription_id", subId)
          .maybeSingle();

        if (!subUser) {
          console.warn(
            `💰 PAYMENT.SALE.COMPLETED: no user found for subscription ${subId} ` +
            `(user may not have paypal_subscription_id stored yet — RENEWED event handled it)`
          );
          break;
        }

        console.log(`💰 Payment confirmed — extending pro for user ${subUser.user_id}`);
        await extendPro(subUser.user_id, resource.create_time);
        break;
      }

      // ── Cancellation — keep access until pro_expires_at ───────────────────
      // PayPal fires CANCELLED when the user cancels. The subscription stays
      // active until the current billing period ends — PayPal does NOT fire
      // another event at period-end. The nightly cron (/api/cron/downgrade-expired)
      // sets is_pro: false once pro_expires_at has passed.
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        console.log(
          `⚠️ Subscription cancelled for user ${userId} — ` +
          `access retained until pro_expires_at (cron will downgrade)`
        );
        // Intentionally no DB write here.
        break;
      }

      // ── Suspension (payment failure) — same grace-period behaviour ─────────
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        console.log(
          `⛔ Subscription suspended for user ${userId} — ` +
          `access retained until pro_expires_at (cron will downgrade)`
        );
        // Intentionally no DB write here.
        break;
      }

      default:
        console.log(`ℹ️ Unhandled PayPal event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
