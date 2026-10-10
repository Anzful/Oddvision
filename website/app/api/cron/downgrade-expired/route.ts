import { NextResponse } from "next/server";
import { getPaddle } from "@/lib/paddle-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncSubscriptionToUser } from "@/lib/subscription-sync";
import { isPayPalServerConfigured } from "@/lib/paypal-config";
import { getPayPalSubscription } from "@/lib/paypal-api";
import { syncPayPalSubscription } from "@/lib/paypal-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily safety net. For Pro users whose `pro_expires_at` has passed:
 *  - Paddle and PayPal subscribers are re-checked with their provider first:
 *    a renewal the webhook missed extends them; anything else downgrades.
 *  - Everyone else (no subscription, not founder-granted) is downgraded.
 * If a provider can't be reached, access is kept and retried tomorrow.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: expired, error } = await db
    .from("user_usage")
    .select("user_id, paddle_subscription_id, paypal_subscription_id")
    .eq("is_pro", true)
    .is("pro_granted_by", null)
    .not("pro_expires_at", "is", null)
    .lte("pro_expires_at", new Date().toISOString());

  if (error) {
    console.error("[cron] query error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const resynced: string[] = [];
  const downgraded: string[] = [];
  const failed: string[] = [];

  const downgrade = async (userId: string) => {
    const { error: updateError } = await db.from("user_usage").update({ is_pro: false }).eq("user_id", userId);
    (updateError ? failed : downgraded).push(userId);
  };

  for (const row of expired ?? []) {
    if (row.paddle_subscription_id) {
      try {
        const subscription = await getPaddle().subscriptions.get(row.paddle_subscription_id);
        await syncSubscriptionToUser(subscription);
        resynced.push(row.user_id);
      } catch (err) {
        console.error(`[cron] Paddle re-check failed for ${row.user_id}`, err);
        failed.push(row.user_id);
      }
      continue;
    }

    if (row.paypal_subscription_id && isPayPalServerConfigured()) {
      try {
        const subscription = await getPayPalSubscription(row.paypal_subscription_id);
        if (subscription?.status === "ACTIVE") {
          await syncPayPalSubscription(subscription);
          resynced.push(row.user_id);
        } else {
          if (subscription) await syncPayPalSubscription(subscription); // record the final status
          await downgrade(row.user_id);
        }
      } catch (err) {
        console.error(`[cron] PayPal re-check failed for ${row.user_id}`, err);
        failed.push(row.user_id);
      }
      continue;
    }

    await downgrade(row.user_id);
  }

  if (expired?.length) console.log("[cron]", { resynced, downgraded, failed });
  return NextResponse.json({
    resynced: resynced.length,
    downgraded: downgraded.length,
    failed: failed.length,
  });
}
