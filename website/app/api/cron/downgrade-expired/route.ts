import { NextResponse } from "next/server";
import { getPaddle } from "@/lib/paddle-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncSubscriptionToUser } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily safety net. For Pro users whose `pro_expires_at` has passed:
 *  - Paddle subscribers are re-checked against the Paddle API (renewals extend
 *    them, cancellations downgrade them) in case a webhook was missed.
 *  - Everyone else (no Paddle subscription, not founder-granted) is downgraded.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: expired, error } = await db
    .from("user_usage")
    .select("user_id, paddle_subscription_id")
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

  for (const row of expired ?? []) {
    if (row.paddle_subscription_id) {
      try {
        const subscription = await getPaddle().subscriptions.get(row.paddle_subscription_id);
        await syncSubscriptionToUser(subscription);
        resynced.push(row.user_id);
      } catch (err) {
        // Keep access for now rather than wrongly removing it; retry tomorrow.
        console.error(`[cron] Paddle re-check failed for ${row.user_id}`, err);
        failed.push(row.user_id);
      }
      continue;
    }

    const { error: updateError } = await db
      .from("user_usage")
      .update({ is_pro: false })
      .eq("user_id", row.user_id);
    if (updateError) failed.push(row.user_id);
    else downgraded.push(row.user_id);
  }

  if (expired?.length) console.log("[cron]", { resynced, downgraded, failed });
  return NextResponse.json({
    resynced: resynced.length,
    downgraded: downgraded.length,
    failed: failed.length,
  });
}
