import type { PayPalSubscription } from "./paypal-api";
import { getSupabaseAdmin } from "./supabase-admin";

const GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENDED = new Set(["CANCELLED", "SUSPENDED", "EXPIRED"]);

export const paypalUserId = (sub: Pick<PayPalSubscription, "custom_id">) =>
  sub.custom_id && UUID_RE.test(sub.custom_id) ? sub.custom_id : null;

/**
 * Pure: the access an ACTIVE PayPal subscription grants — through its next
 * billing time plus a grace buffer, never shortening an expiry already earned.
 */
export function paypalActiveExpiry(
  sub: Pick<PayPalSubscription, "billing_info">,
  currentExpiry: string | null,
  now = Date.now(),
): string {
  const next = sub.billing_info?.next_billing_time;
  const end = (next ? Date.parse(next) : now + 30 * DAY_MS) + GRACE_DAYS * DAY_MS;
  const current = currentExpiry ? Date.parse(currentExpiry) : 0;
  return new Date(Math.max(end, current)).toISOString();
}

export type PayPalSyncResult =
  | { status: "synced"; userId: string; isPro: boolean }
  | { status: "unlinked" };

/**
 * Writes a freshly fetched PayPal subscription onto `user_usage`. ACTIVE
 * extends Pro; CANCELLED / SUSPENDED / EXPIRED keep Pro until the period the
 * user already paid for ends (`pro_expires_at`), after which the daily cron
 * downgrades them. Founder-granted Pro is never touched.
 */
export async function syncPayPalSubscription(sub: PayPalSubscription): Promise<PayPalSyncResult> {
  const db = getSupabaseAdmin();

  let userId = paypalUserId(sub);
  if (!userId) {
    const { data } = await db.from("user_usage").select("user_id").eq("paypal_subscription_id", sub.id).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return { status: "unlinked" };

  const { data: row, error: readError } = await db
    .from("user_usage")
    .select("is_pro, pro_expires_at, pro_granted_by")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const active = sub.status === "ACTIVE";
  const update: Record<string, unknown> = {
    user_id: userId,
    paypal_subscription_id: sub.id,
    subscription_status: sub.status.toLowerCase(),
    next_billing_date: active ? sub.billing_info?.next_billing_time ?? null : null,
    subscription_cancel_at: ENDED.has(sub.status) ? row?.pro_expires_at ?? null : null,
  };

  const founderGranted = Boolean(row?.pro_granted_by);
  let isPro = Boolean(row?.is_pro) && !(row?.pro_expires_at && Date.parse(row.pro_expires_at) <= Date.now());
  if (active && !founderGranted) {
    update.is_pro = true;
    update.pro_expires_at = paypalActiveExpiry(sub, row?.pro_expires_at ?? null);
    isPro = true;
  }

  const { error } = await db.from("user_usage").upsert(update, { onConflict: "user_id" });
  if (error) throw error;
  return { status: "synced", userId, isPro };
}
