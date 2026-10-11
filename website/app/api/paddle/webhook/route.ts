import { NextResponse } from "next/server";
import { getPaddleWebhookCidrs, ipInCidrs, verifyPaddleSignature } from "@/lib/paddle-webhook";
import { getPaddle } from "@/lib/paddle-server";
import { syncSubscriptionToUser } from "@/lib/subscription-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: { id?: string; subscription_id?: string | null };
};

/**
 * Paddle notification destination. Subscribe it to:
 * subscription.created/updated/activated/canceled/past_due/paused/resumed/trialing
 * and transaction.completed.
 *
 * Every event is treated as "this subscription changed": we re-fetch the
 * subscription from the Paddle API and sync its current state, so duplicate or
 * out-of-order deliveries can't leave a user with the wrong access.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[paddle/webhook] PADDLE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifyPaddleSignature(rawBody, req.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only accept deliveries from Paddle's published IPs. Enforced on Vercel,
  // which sets x-real-ip itself so it can't be spoofed; local tunnels skip it.
  if (process.env.VERCEL) {
    const cidrs = await getPaddleWebhookCidrs();
    if (!cidrs) {
      // Can't tell who is calling; a 5xx makes Paddle retry later.
      return NextResponse.json({ error: "IP allowlist unavailable" }, { status: 503 });
    }
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "";
    if (!ipInCidrs(ip, cidrs)) {
      console.warn(`[paddle/webhook] rejected delivery from ${ip || "unknown IP"}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!event || typeof event.event_type !== "string" || !event.data || typeof event.data !== "object") {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const subscriptionId = event.event_type.startsWith("subscription.")
    ? event.data.id
    : event.event_type === "transaction.completed"
      ? event.data.subscription_id
      : null;

  if (!subscriptionId) {
    return NextResponse.json({ received: true, ignored: event.event_type });
  }
  if (typeof subscriptionId !== "string" || !/^sub_[a-z0-9]+$/i.test(subscriptionId)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  try {
    const subscription = await getPaddle().subscriptions.get(subscriptionId);
    const result = await syncSubscriptionToUser(subscription);
    if (result.status === "unlinked") {
      console.warn(`[paddle/webhook] ${event.event_type} ${subscriptionId}: no user_id in custom_data`);
    } else {
      console.log(`[paddle/webhook] ${event.event_type} ${subscriptionId} -> ${result.status} (${result.userId})`);
    }
    return NextResponse.json({ received: true, result: result.status });
  } catch (err) {
    // The subscription doesn't exist (e.g. simulator demo data): retrying can't help.
    const code = (err as { code?: string })?.code;
    if (code === "entity_not_found" || code === "not_found" || code === "invalid_url") {
      console.warn(`[paddle/webhook] ${event.event_type} ${subscriptionId}: subscription not found (${code})`);
      return NextResponse.json({ received: true, result: "not_found" });
    }
    // Anything else may be transient; a 5xx makes Paddle retry with backoff.
    console.error(`[paddle/webhook] failed to process ${event.event_id}`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
