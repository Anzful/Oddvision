import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    console.log(`Syncing subscription ${subscriptionId} for user ${userId}`);

    // Update user_usage table
    // We assume the table 'user_usage' exists and has 'is_pro' column
    const { error } = await supabaseAdmin
      .from("user_usage")
      .update({ 
        is_pro: true,
        // Store subscription ID if you added a column for it, otherwise just flip the flag
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

