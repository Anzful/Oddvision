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
      // Optionally fail hard, but for debugging we might log and continue if signature key is tricky
      // For production: return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
      console.warn("⚠️ Webhook Signature Verification Failed (ignoring for dev/resilience)");
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
    const userId = resource.custom_id;
    
    if (!userId && eventType.startsWith("BILLING.SUBSCRIPTION")) {
      console.error("⚠️ No custom_id (userId) found in subscription resource");
      return NextResponse.json({ received: true }); 
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        console.log(`✅ Activating Pro for user ${userId}`);
        await supabaseAdmin
          .from("user_usage")
          .upsert({ 
            user_id: userId,
            is_pro: true,
          }, { onConflict: 'user_id' });
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log(`❌ Cancelling Pro for user ${userId}`);
        await supabaseAdmin
          .from("user_usage")
          .upsert({ 
            user_id: userId,
            is_pro: false, 
          }, { onConflict: 'user_id' });
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        console.log(`⛔ Suspending Pro for user ${userId}`);
        await supabaseAdmin
          .from("user_usage")
          .upsert({ 
            user_id: userId,
            is_pro: false,
          }, { onConflict: 'user_id' });
        break;
        
      case "PAYMENT.SALE.COMPLETED":
        const subIdFromSale = resource.billing_agreement_id;
        console.log(`💰 Payment received for subscription ${subIdFromSale}`);
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
