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
  const cancelAt =
    sub.scheduledChange?.action === "cancel" ? sub.scheduledChange.effectiveAt : null;
  const stopsAt = ["cancel", "pause"].includes(sub.scheduledChange?.action ?? "")
    ? sub.scheduledChange!.effectiveAt : null;

  let proExpiresAt: string | null = null;
  if (ACCESS_STATUSES.has(sub.status)) {
    if (stopsAt) {
      // Canceled at period end: access stops exactly when the paid period does.
      proExpiresAt = new Date(stopsAt).toISOString();
    } else {
      const periodEnd = sub.currentBillingPeriod?.endsAt ?? sub.nextBilledAt;
      // Keep the documented grace policy throughout Paddle's payment retries.
      const end = sub.status === "past_due"
        ? Math.max(periodEnd ? new Date(periodEnd).getTime() : 0, now.getTime())
        : periodEnd ? new Date(periodEnd).getTime() : now.getTime();
      proExpiresAt = new Date(end + GRACE_DAYS * DAY_MS).toISOString();
    }
  }

  const isPro = proExpiresAt !== null && new Date(proExpiresAt) > now;
  return {
    isPro,
    proExpiresAt,
    nextBillingDate: isPro && !stopsAt ? sub.nextBilledAt : null,
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

  // An existing server-side link wins over editable checkout custom data.
  const { data: linked, error: linkError } = await db
    .from("user_usage")
    .select("user_id")
    .eq("paddle_subscription_id", sub.id)
    .maybeSingle();
  if (linkError) throw linkError;
  const customUserId = userIdFromCustomData(sub.customData);
  if (linked && customUserId && linked.user_id !== customUserId) {
    throw new Error("Subscription ownership changed unexpectedly");
  }
  const userId: string | null = linked?.user_id ?? customUserId;
  if (!userId) return { status: "unlinked" };

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID?.trim();
  if (!priceId) throw new Error("NEXT_PUBLIC_PADDLE_PRICE_ID is not set");
  const proPrices = new Set([priceId, ...(process.env.PADDLE_PRO_PRICE_IDS ?? "").split(",").map((id) => id.trim())]);
  const hasProPrice = sub.items.some((item) => proPrices.has(item.price.id));
  // Preserve grandfathered prices for existing links when the checkout price changes.
  if (!linked && !hasProPrice) return { status: "ignored", userId };

  // Compare-and-swap makes the stale-event and manual-grant checks atomic.
  // A plain read followed by upsert lets concurrent webhooks undo one another.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row, error: readError } = await db
      .from("user_usage")
      .select("is_pro, pro_expires_at, pro_granted_by, paddle_subscription_id, subscription_status, paddle_updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw readError;

    if (row?.paddle_subscription_id === sub.id && row.paddle_updated_at &&
        new Date(row.paddle_updated_at) > new Date(sub.updatedAt)) {
      return { status: "stale", userId };
    }

    const access = accessFromSubscription(sub);
    // A dead secondary subscription must not switch off a different live one.
    if (row?.paddle_subscription_id && row.paddle_subscription_id !== sub.id &&
        !access.isPro && ACCESS_STATUSES.has(row.subscription_status ?? "")) {
      return { status: "ignored", userId };
    }

    const update: Record<string, unknown> = {
      paddle_customer_id: sub.customerId,
      paddle_subscription_id: sub.id,
      subscription_status: sub.status,
      next_billing_date: access.nextBillingDate,
      subscription_cancel_at: access.cancelAt,
      paddle_updated_at: sub.updatedAt,
    };
    const founderGranted = Boolean(row?.pro_granted_by);
    if (!founderGranted) {
      update.is_pro = access.isPro;
      update.pro_expires_at = access.proExpiresAt;
    }

    if (!row) {
      // Another request may create the usage row while this request is running.
      const { data, error } = await db.from("user_usage")
        .upsert({ user_id: userId, ...update }, { onConflict: "user_id", ignoreDuplicates: true })
        .select("user_id");
      if (error) throw error;
      if (!data?.length) continue;
    } else {
      let query = db.from("user_usage").update(update).eq("user_id", userId);
      for (const column of ["paddle_subscription_id", "paddle_updated_at", "subscription_status", "pro_granted_by", "is_pro", "pro_expires_at"] as const) {
        query = row[column] == null ? query.is(column, null) : query.eq(column, row[column]);
      }
      const { data, error } = await query.select("user_id");
      if (error) throw error;
      if (!data?.length) continue;
    }
    return { status: "synced", userId, isPro: founderGranted
      ? !!row?.is_pro && (!row.pro_expires_at || new Date(row.pro_expires_at) > new Date())
      : access.isPro };
  }
  throw new Error("Subscription changed concurrently; retry sync");
}
