import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PAYPAL_CONFIG } from "@/lib/paypal-config";
import { getPayPalAccessToken } from "@/lib/paypal-api";

export async function POST(req: Request) {
  try {
    // Debugging Env Vars (Safe logging)
    const configDebug = {
      hasClientId: !!PAYPAL_CONFIG.clientId,
      hasClientSecret: !!PAYPAL_CONFIG.clientSecret,
      apiUrl: PAYPAL_CONFIG.apiUrl,
      clientIdPrefix: PAYPAL_CONFIG.clientId ? PAYPAL_CONFIG.clientId.substring(0, 4) + "..." : "MISSING",
      secretLength: PAYPAL_CONFIG.clientSecret?.length || 0
    };
    
    console.log("PayPal Sync Debug:", configDebug);

    if (!PAYPAL_CONFIG.clientSecret) {
      console.error("CRITICAL: PAYPAL_CLIENT_SECRET is missing on the server.");
      return NextResponse.json({ 
        error: "Server Configuration Error: Missing PayPal Secret" 
      }, { status: 500 });
    }

    // Initialize Supabase Admin Client (Service Role) inside the handler
    // to prevent build-time errors if env vars are missing during static analysis
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    console.log(`Verifying subscription ${subscriptionId} for user ${userId}`);

    // 1. Verify with PayPal API
    try {
        const accessToken = await getPayPalAccessToken();
        if (!accessToken) {
             throw new Error("Failed to obtain PayPal access token (empty response)");
        }

        const subResponse = await fetch(`${PAYPAL_CONFIG.apiUrl}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        
        if (!subResponse.ok) {
            const errorText = await subResponse.text();
            console.error("PayPal Subscription Check Failed:", subResponse.status, errorText);
            
            // Handle 404 specifically (Wrong Environment)
            if (subResponse.status === 404) {
              throw new Error(`Subscription ID not found. Target: ${PAYPAL_CONFIG.apiUrl} (Check Live vs Sandbox)`);
            }
            
            throw new Error(`PayPal API Error: ${subResponse.status} ${subResponse.statusText}`);
        }

        const subData = await subResponse.json();
        
        if (subData.status !== 'ACTIVE') {
            console.error("Subscription not active:", subData.status);
            return NextResponse.json({ error: `Subscription is not active (Status: ${subData.status})` }, { status: 400 });
        }
        
        console.log("PayPal Verified: Active");
    } catch (verifyErr: any) {
        console.error("PayPal Verification Failed:", verifyErr);
        
        // Construct a detailed debug message for the client alert
        const debugMsg = `[Target: ${configDebug.apiUrl}, ClientID: ${configDebug.clientIdPrefix}]`;
        
        return NextResponse.json({ 
            error: `Verification failed: ${verifyErr.message || "Unknown error"} ${debugMsg}` 
        }, { status: 500 });
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
