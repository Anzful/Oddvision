import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PAYPAL_CONFIG } from "@/lib/paypal-config";

// Initialize Supabase Admin Client (Service Role)
// Make sure SUPABASE_SERVICE_ROLE_KEY is in .env.local or Vercel Env Vars
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    console.log(`Verifying subscription ${subscriptionId} for user ${userId}`);

    // 1. Verify with PayPal API
    try {
        const accessToken = await getPayPalAccessToken();
        const subResponse = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        
        const subData = await subResponse.json();
        
        if (subData.status !== 'ACTIVE') {
            console.error("Subscription not active:", subData.status);
            return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
        }
        
        console.log("PayPal Verified: Active");
    } catch (verifyErr) {
        console.error("PayPal Verification Failed:", verifyErr);
        // In Sandbox dev, you might want to allow it anyway if network fails, but in Prod: FAIL.
        return NextResponse.json({ error: "Could not verify subscription with PayPal" }, { status: 500 });
    }

    // 2. Update user_usage table
    const { error } = await supabaseAdmin
      .from("user_usage")
      .update({ 
        is_pro: true,
        // Store subscription ID if you added a column for it
        // paypal_subscription_id: subscriptionId 
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync handler error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
