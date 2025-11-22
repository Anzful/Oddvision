"use client";

import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID!;

export default function Pricing() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Debug Environment Variables
    console.log("PayPal Config:", {
      clientId: PAYPAL_CLIENT_ID ? "Present" : "Missing",
      planId: PAYPAL_PLAN_ID ? "Present" : "Missing"
    });

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

      <div className="max-w-md mx-auto mt-12 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
        {/* Discount Badge */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-3 hover:scale-105 transition-transform">
          50% OFF
        </div>

        <div className="flex flex-col items-start mb-8">
          <span className="text-2xl font-bold mb-1">Monthly Plan</span>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              $7.50
            </span>
            <span className="text-lg text-gray-500 line-through font-medium decoration-gray-500/50">
              $14.99
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1">per month</span>
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
                  shape: "rect",
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
                onError={(err: any) => {
                  console.error("PayPal Error Object:", err);
                  
                  let errorMessage = "Unknown error";
                  if (err?.message) {
                    errorMessage = err.message;
                  } else if (typeof err === "string") {
                    errorMessage = err;
                  } else {
                    // Try to stringify, but if empty object (common for Error objects), use toString
                    const json = JSON.stringify(err);
                    errorMessage = json === "{}" ? String(err) : json;
                  }

                  console.error("PayPal Error Message:", errorMessage);
                  
                  if (errorMessage.includes("RESOURCE_NOT_FOUND")) {
                    alert("Configuration Error: The Plan ID is invalid. Please check your PayPal Dashboard.");
                  } else {
                    alert("PayPal Error: " + errorMessage);
                  }
                }}
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
