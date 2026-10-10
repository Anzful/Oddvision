import type { Subscription } from "@paddle/paddle-node-sdk";
import { getSupabaseAdmin } from "./supabase-admin";

/** Statuses that keep Pro on. `past_due` keeps access while Paddle retries the card. */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);
/** Buffer after the billing period ends, so a slightly late renewal never drops Pro. */
const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubscriptionAccess = {
  isPro: boolean;
  proExpiresAt: string | null;
  nextBillingDate: string | null;
  cancelAt: string | null;
};

type SubscriptionLike = Pick<
  Subscription,
  "status" | "currentBillingPeriod" | "nextBilledAt" | "scheduledChange"
>;

/** Pure mapping from a Paddle subscription to the access we grant. */
export function accessFromSubscription(sub: SubscriptionLike, now = new Date()): SubscriptionAccess {
  const isPro = ACCESS_STATUSES.has(sub.status);
  const cancelAt =
    sub.scheduledChange?.action === "cancel" ? sub.scheduledChange.effectiveAt : null;

  let proExpiresAt: string | null = null;
  if (isPro) {
    if (cancelAt) {
      // Canceled at period end: access stops exactly when the paid period does.
      proExpiresAt = new Date(cancelAt).toISOString();
    } else {
      const periodEnd = sub.currentBillingPeriod?.endsAt ?? sub.nextBilledAt;
      const end = periodEnd ? new Date(periodEnd).getTime() : now.getTime() + 30 * DAY_MS;
      proExpiresAt = new Date(end + GRACE_DAYS * DAY_MS).toISOString();
    }
  }

  return {
    isPro,
    proExpiresAt,
    nextBillingDate: isPro && !cancelAt ? sub.nextBilledAt : null,
    cancelAt,
  };
}

export function userIdFromCustomData(customData: unknown): string | null {
  const id = (customData as { user_id?: unknown } | null)?.user_id;
  return typeof id === "string" && UUID_RE.test(id) ? id : null;
}

export type SyncResult =
  | { status: "synced"; userId: string; isPro: boolean }
  | { status: "stale" | "ignored"; userId: string }
  | { status: "unlinked" };

/**
 * Writes a subscription's current state onto the user's `user_usage` row —
 * the same `is_pro` / `pro_expires_at` columns the extension and site read.
 * Always pass a freshly fetched subscription so event order doesn't matter.
 */
export async function syncSubscriptionToUser(sub: Subscription): Promise<SyncResult> {
  const db = getSupabaseAdmin();

  let userId = userIdFromCustomData(sub.customData);
  if (!userId) {
    const { data } = await db
      .from("user_usage")
      .select("user_id")
      .eq("paddle_subscription_id", sub.id)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return { status: "unlinked" };

  const { data: row, error: readError } = await db
    .from("user_usage")
    .select("is_pro, pro_granted_by, paddle_subscription_id, subscription_status, paddle_updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  // Never overwrite newer data with an older snapshot.
  if (
    row?.paddle_subscription_id === sub.id &&
    row.paddle_updated_at &&
    new Date(row.paddle_updated_at) > new Date(sub.updatedAt)
  ) {
    return { status: "stale", userId };
  }

  const access = accessFromSubscription(sub);

  // A dead secondary subscription must not switch off a different live one.
  if (
    row?.paddle_subscription_id &&
    row.paddle_subscription_id !== sub.id &&
    !access.isPro &&
    ACCESS_STATUSES.has(row.subscription_status ?? "")
  ) {
    return { status: "ignored", userId };
  }

  const update: Record<string, unknown> = {
    user_id: userId,
    paddle_customer_id: sub.customerId,
    paddle_subscription_id: sub.id,
    subscription_status: sub.status,
    next_billing_date: access.nextBillingDate,
    subscription_cancel_at: access.cancelAt,
    paddle_updated_at: sub.updatedAt,
  };
  // Founder-granted Pro is managed by hand; billing never revokes it.
  const founderGranted = Boolean(row?.pro_granted_by);
  if (!founderGranted) {
    update.is_pro = access.isPro;
    update.pro_expires_at = access.proExpiresAt;
  }

  const { error } = await db.from("user_usage").upsert(update, { onConflict: "user_id" });
  if (error) throw error;

  return { status: "synced", userId, isPro: founderGranted ? Boolean(row?.is_pro) : access.isPro };
}
