import { NextResponse } from "next/server";
import { getPaddle } from "@/lib/paddle-server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase-admin";
import { userIdFromCustomData } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a short-lived Paddle customer-portal session for the signed-in user
 * (cancel, update card, invoices). Ownership is checked against Paddle's own
 * record of the subscription, not just our database row.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: row, error } = await getSupabaseAdmin()
    .from("user_usage")
    .select("paddle_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[paddle/portal] db error", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!row?.paddle_subscription_id) {
    return NextResponse.json({ error: "No Paddle subscription on this account" }, { status: 404 });
  }

  try {
    const paddle = getPaddle();
    const subscription = await paddle.subscriptions.get(row.paddle_subscription_id);
    if (userIdFromCustomData(subscription.customData) !== user.id) {
      return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
    }

    const session = await paddle.customerPortalSessions.create(subscription.customerId, [subscription.id]);
    const links = session.urls.subscriptions.find((s) => s.id === subscription.id);
    return NextResponse.json({
      url: session.urls.general.overview,
      cancelUrl: links?.cancelSubscription ?? null,
      updatePaymentUrl: links?.updateSubscriptionPaymentMethod ?? null,
    });
  } catch (err) {
    console.error("[paddle/portal] error", err);
    return NextResponse.json({ error: "Could not open the billing portal" }, { status: 502 });
  }
}
