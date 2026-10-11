export type UsageRow = {
  is_pro?: boolean;
  pro_expires_at?: string | null;
  pro_granted_by?: string | null;
  next_billing_date?: string | null;
  subscription_status?: string | null;
  subscription_cancel_at?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
};

export const isRowPro = (usage: UsageRow | null) =>
  !!usage?.is_pro && (!usage.pro_expires_at || new Date(usage.pro_expires_at) > new Date());

// Explicit session token avoids reentering the Supabase auth lock in callbacks.
// A failed read must not look like a free account and offer a second subscription.
export async function fetchProStatusDirect(userId: string, accessToken: string): Promise<UsageRow | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_usage?user_id=eq.${encodeURIComponent(userId)}&select=is_pro,pro_expires_at,pro_granted_by,next_billing_date,subscription_status,subscription_cancel_at,paddle_customer_id,paddle_subscription_id`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Could not load your subscription. Refresh the page to try again.");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid subscription response");
  return rows[0] ?? null;
}
