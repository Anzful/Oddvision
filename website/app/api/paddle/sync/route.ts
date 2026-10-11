import { NextResponse } from "next/server";
import { getPaddle } from "@/lib/paddle-server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase-admin";
import { syncSubscriptionToUser, userIdFromCustomData } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the pricing page right after `checkout.completed`, so Pro turns on
 * immediately instead of waiting for the webhook. The caller must be signed
 * in, and the transaction must belong to them — the user id comes from the
 * verified JWT, never from the request body.
 *
 * Returns `{ pending: true }` while Paddle is still creating the subscription;
 * the client simply polls again.
 */
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : "";
  if (!/^txn_[a-z0-9]+$/i.test(transactionId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  try {
    const paddle = getPaddle();
    const transaction = await paddle.transactions.get(transactionId);

    if (userIdFromCustomData(transaction.customData) !== user.id) {
      return NextResponse.json({ error: "Transaction does not belong to this account" }, { status: 403 });
    }
    if (!transaction.subscriptionId) {
      return NextResponse.json({ pending: true, transactionStatus: transaction.status });
    }

    const subscription = await paddle.subscriptions.get(transaction.subscriptionId);
    if (userIdFromCustomData(subscription.customData) !== user.id || subscription.customerId !== transaction.customerId) {
      return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
    }
    const result = await syncSubscriptionToUser(subscription);
    if (result.status === "unlinked" || result.userId !== user.id) {
      return NextResponse.json({ error: "Could not link the purchase" }, { status: 409 });
    }
    const { data: usage, error } = await getSupabaseAdmin().from("user_usage")
      .select("is_pro, pro_expires_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      pending: false,
      isPro: !!usage?.is_pro && (!usage.pro_expires_at || new Date(usage.pro_expires_at) > new Date()),
      status: subscription.status,
    });
  } catch (err) {
    console.error("[paddle/sync] error", err);
    return NextResponse.json({ error: "Could not verify the purchase yet" }, { status: 502 });
  }
}
