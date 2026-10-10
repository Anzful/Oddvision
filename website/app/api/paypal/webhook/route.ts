import { NextResponse } from "next/server";
import { isPayPalServerConfigured } from "@/lib/paypal-config";
import { getPayPalSubscription, verifyPayPalWebhookSignature } from "@/lib/paypal-api";
import { syncPayPalSubscription } from "@/lib/paypal-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal webhook (temporary bridge until Paddle). Unverified requests are
 * rejected. Every subscription event re-fetches the subscription from PayPal
 * and syncs its current state, so duplicates and out-of-order delivery are
 * harmless and renewals always extend Pro.
 */
export async function POST(req: Request) {
  if (!isPayPalServerConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  let event: { event_type?: string; resource?: { id?: string; billing_agreement_id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = await verifyPayPalWebhookSignature(req, rawBody).catch((err) => {
    console.error("[paypal/webhook] verification error", err);
    return false;
  });
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const type = event.event_type ?? "";
  const subscriptionId = type.startsWith("BILLING.SUBSCRIPTION.")
    ? event.resource?.id
    : type === "PAYMENT.SALE.COMPLETED"
      ? event.resource?.billing_agreement_id
      : undefined;
  if (!subscriptionId) {
    return NextResponse.json({ received: true, ignored: type });
  }

  try {
    const subscription = await getPayPalSubscription(subscriptionId);
    if (!subscription) {
      console.warn(`[paypal/webhook] ${type} ${subscriptionId}: subscription not found`);
      return NextResponse.json({ received: true, result: "not_found" });
    }
    const result = await syncPayPalSubscription(subscription);
    console.log(`[paypal/webhook] ${type} ${subscriptionId} (${subscription.status}) -> ${result.status}`);
    return NextResponse.json({ received: true, result: result.status });
  } catch (err) {
    // A 5xx makes PayPal retry the delivery.
    console.error(`[paypal/webhook] failed to process ${type} ${subscriptionId}`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
