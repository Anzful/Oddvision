"use client";

import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

const PAYPAL_CLIENT_ID = "AaK2czAq5PwwqmR5OOLXUEqWGSLENkMOw_tayR8TmB8Ao_4fG4NPmMYOuiIKLSh09atnPJX3gUw-kBbZ";
const PAYPAL_PLAN_ID = "P-14C86532YB056482YNEQOTRI";

export default function Pricing() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleApprove = async (data: any, actions: any) => {
    console.log("Subscription approved:", data.subscriptionID);
    
    // Call our backend to link the subscription to the user
    try {
      const response = await fetch('/api/subscription/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: data.subscriptionID,
          userId: user?.id
        }),
      });

      if (response.ok) {
        alert("Subscription successful! Your Pro features are now active.");
      } else {
        console.error("Failed to sync subscription");
        alert("Payment successful, but account update failed. Please contact support.");
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  return (
    <div className="ov-container py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="ov-hero-title">Upgrade to Pro</h1>
        <p className="ov-hero-subtitle">
          Unlock unlimited prompts and premium features.
        </p>
      </div>

      <div className="max-w-md mx-auto mt-12 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        <div className="flex justify-between items-baseline mb-8">
          <span className="text-2xl font-bold">Monthly Plan</span>
          <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            $5.00
          </span>
        </div>

        <ul className="space-y-4 mb-8 text-gray-300">
          <li className="flex items-center gap-3">
            <span className="text-cyan-400">✓</span> Unlimited AI analysis
          </li>
          <li className="flex items-center gap-3">
            <span className="text-cyan-400">✓</span> Priority support
          </li>
          <li className="flex items-center gap-3">
            <span className="text-cyan-400">✓</span> Early access to new features
          </li>
        </ul>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : user ? (
          <div className="w-full">
            <PayPalScriptProvider
              options={{
                clientId: PAYPAL_CLIENT_ID,
                vault: true,
                intent: "subscription",
              }}
            >
              <PayPalButtons
                style={{
                  shape: "pill",
                  color: "gold",
                  layout: "vertical",
                  label: "subscribe",
                }}
                createSubscription={(data, actions) => {
                  return actions.subscription.create({
                    plan_id: PAYPAL_PLAN_ID,
                    custom_id: user.id // Link payment to Supabase User ID
                  });
                }}
                onApprove={handleApprove}
              />
            </PayPalScriptProvider>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-4 text-sm text-gray-400">Please log in to subscribe</p>
            <Link href="/login" className="ov-btn ov-btn--primary w-full justify-center">
              Log In to Subscribe
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

