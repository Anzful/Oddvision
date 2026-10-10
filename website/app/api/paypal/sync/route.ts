import { NextResponse } from "next/server";
import { isPayPalServerConfigured } from "@/lib/paypal-config";
import { getPayPalSubscription } from "@/lib/paypal-api";
import { paypalUserId, syncPayPalSubscription } from "@/lib/paypal-sync";
import { getUserFromRequest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the pricing page right after PayPal approval so Pro turns on at
 * once. The user comes from the verified Supabase JWT, and the subscription's
 * custom_id must match it — a caller can't activate someone else's purchase.
 * Returns `{ pending: true }` while PayPal is still activating; the client polls.
 */
export async function POST(req: Request) {
  if (!isPayPalServerConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : "";
  if (!/^I-[A-Z0-9]+$/.test(subscriptionId)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  try {
    const subscription = await getPayPalSubscription(subscriptionId);
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    if (paypalUserId(subscription) !== user.id) {
      return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
    }
    if (subscription.status === "APPROVAL_PENDING" || subscription.status === "APPROVED") {
      return NextResponse.json({ pending: true, status: subscription.status });
    }

    const result = await syncPayPalSubscription(subscription);
    return NextResponse.json({
      pending: false,
      isPro: result.status === "synced" ? result.isPro : false,
      status: subscription.status,
    });
  } catch (err) {
    console.error("[paypal/sync] error", err);
    return NextResponse.json({ error: "Could not verify the subscription yet" }, { status: 502 });
  }
}
