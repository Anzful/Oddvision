import { NextResponse } from "next/server";
import { getPaddle } from "@/lib/paddle-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncSubscriptionToUser } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily reconciliation also repairs missed renewal/resume webhooks for free users. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const cutoff = new Date().toISOString();
  let cursor: string | null = null;
  let resynced = 0;
  let downgraded = 0;
  let failed = 0;

  // Keyset pagination avoids skipping rows as expired legacy users are downgraded.
  for (;;) {
    let query = db.from("user_usage")
      .select("user_id, paddle_subscription_id")
      .or(`paddle_subscription_id.not.is.null,and(is_pro.eq.true,pro_granted_by.is.null,pro_expires_at.lte.${cutoff})`)
      .order("user_id").limit(100);
    if (cursor) query = query.gt("user_id", cursor);
    const { data: rows, error } = await query;
    if (error) {
      console.error("[cron] query error", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (!rows?.length) break;

    for (const row of rows) {
      if (row.paddle_subscription_id) {
        try {
          const subscription = await getPaddle().subscriptions.get(row.paddle_subscription_id);
          const result = await syncSubscriptionToUser(subscription);
          if (result.status === "unlinked") failed++;
          else resynced++;
        } catch (err) {
          console.error(`[cron] Paddle re-check failed for ${row.user_id}`, err);
          failed++;
        }
      } else {
        // Recheck the conditions in the write: a purchase/manual grant may race us.
        const { data, error: updateError } = await db.from("user_usage")
          .update({ is_pro: false })
          .eq("user_id", row.user_id).eq("is_pro", true)
          .is("paddle_subscription_id", null).is("pro_granted_by", null)
          .lte("pro_expires_at", cutoff).select("user_id");
        if (updateError) failed++;
        else downgraded += data?.length ?? 0;
      }
    }
    cursor = rows[rows.length - 1].user_id;
    if (rows.length < 100) break;
  }

  return NextResponse.json({ resynced, downgraded, failed }, { status: failed ? 500 : 200 });
}
