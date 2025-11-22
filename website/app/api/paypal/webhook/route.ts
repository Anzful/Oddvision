import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPayPalWebhookSignature } from "@/lib/paypal-api";

export async function POST(req: Request) {
  try {
    // 1. Get the raw body text for verification
    const bodyText = await req.text();
    
    // 2. Verify Signature
    const isValid = await verifyPayPalWebhookSignature(req, bodyText);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    // 3. Parse Event
    const event = JSON.parse(bodyText);
    const eventType = event.event_type;
    const resource = event.resource;
    
    console.log(`🔔 PayPal Webhook received: ${eventType}`, resource.id);

    // 4. Initialize Supabase Admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Handle Events
    // In most subscription events, custom_id should be the user_id we sent
    const userId = resource.custom_id;
    const subscriptionId = resource.id;

    if (!userId && eventType.startsWith("BILLING.SUBSCRIPTION")) {
      console.error("⚠️ No custom_id (userId) found in subscription resource");
      // We can't update the user if we don't know who it is. 
      // If you store subscription_id in your DB, you could look up by that instead.
      return NextResponse.json({ received: true }); // Acknowledge anyway
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        console.log(`✅ Activating Pro for user ${userId}`);
        await supabaseAdmin
          .from("user_usage")
          .update({ 
            is_pro: true,
            // If you added these columns to your DB:
            // paypal_subscription_id: subscriptionId,
            // subscription_status: 'active'
          })
          .eq("user_id", userId);
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log(`❌ Cancelling Pro for user ${userId}`);
        // NOTE: Ideally you should set an 'end_date' and keep is_pro=true until then.
        // For now, we'll disable it or set status to cancelled.
        await supabaseAdmin
          .from("user_usage")
          .update({ 
            is_pro: false, 
            // subscription_status: 'cancelled'
          })
          .eq("user_id", userId);
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        console.log(`⛔ Suspending Pro for user ${userId}`);
        await supabaseAdmin
          .from("user_usage")
          .update({ 
            is_pro: false,
            // subscription_status: 'suspended'
          })
          .eq("user_id", userId);
        break;
        
      case "PAYMENT.SALE.COMPLETED":
        // This event happens on every successful payment (initial + recurring)
        // The resource is a 'sale' object, which usually has 'billing_agreement_id' pointing to the subscription
        const subIdFromSale = resource.billing_agreement_id;
        console.log(`💰 Payment received for subscription ${subIdFromSale}`);
        // If we didn't get BILLING.SUBSCRIPTION.ACTIVATED for some reason, we could ensure is_pro=true here.
        // But we need to look up the user by subscription_id if custom_id isn't on the sale object.
        break;

      default:
        console.log("ℹ️ Unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

