"use client";

import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID!;

const fetchProStatus = async (userId: string) => {
  console.log("Fetching usage for:", userId);
  try {
    const { data: usage, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching usage:", error);
      return null;
    }
    console.log("Usage data:", usage);
    return usage;
  } catch (err) {
    console.error("Exception fetching usage:", err);
    return null;
  }
};

export default function PricingSection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let initialLoadComplete = false;

    const init = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
           console.warn("getUser failed, checking session:", userError);
           const { data: { session } } = await supabase.auth.getSession();
           if (session?.user && mounted) {
               setUser(session.user);
               const usage = await fetchProStatus(session.user.id);
               if (mounted) {
                   if (usage) {
                       setIsPro(!!usage.is_pro);
                       setSubscriptionData(usage);
                   } else {
                       setIsPro(false);
                       setSubscriptionData(null);
                   }
               }
           } else {
               if (mounted) {
                   setUser(null);
                   setIsPro(false);
                   setSubscriptionData(null);
               }
           }
        } else if (currentUser) {
          if (mounted) setUser(currentUser);
          const usage = await fetchProStatus(currentUser.id);
          if (mounted) {
            if (usage) {
              setIsPro(!!usage.is_pro);
              setSubscriptionData(usage);
            } else {
              setIsPro(false);
              setSubscriptionData(null);
            }
          }
        } else {
          if (mounted) {
              setUser(null);
              setIsPro(false);
              setSubscriptionData(null);
          }
        }
      } catch (error) {
        console.error("Session init error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
          initialLoadComplete = true;
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("Auth state changed:", event);
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Skip if initial load hasn't completed (prevents double-fetch on mount)
      if (!initialLoadComplete && event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentUser) {
            const usage = await fetchProStatus(currentUser.id);
            if (mounted) {
                if (usage) {
                    setIsPro(!!usage.is_pro);
                    setSubscriptionData(usage);
                } else {
                    setIsPro(false);
                    setSubscriptionData(null);
                }
                // Ensure loading is off after fetch completes
                setLoading(false);
            }
        } else {
            if (mounted) {
                setIsPro(false);
                setSubscriptionData(null);
                setLoading(false);
            }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
            setIsPro(false);
            setSubscriptionData(null);
            setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleApprove = async (data: any, actions: any) => {
    console.log("Subscription approved:", data.subscriptionID);
    
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
        setIsPro(true); 
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error("Failed to sync subscription:", errorData);
        alert(`Payment successful, but account update failed: ${errorData.error || "Unknown error"}. Please contact support.`);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  return (
    <section id="pricing" className="ov-section">
      <div className="ov-container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="ov-section-title">Upgrade to Pro</h2>
          <p className="ov-hero-subtitle" style={{ fontSize: '16px', margin: '0 auto' }}>
            Unlock unlimited prompts and premium features.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
          {!isPro && !loading && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-3 hover:scale-105 transition-transform">
              50% OFF
            </div>
          )}

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
          ) : isPro ? (
             <div className="w-full bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                <div className="text-green-400 text-lg font-bold mb-2">
                   ✨ You are Pro
                </div>
                <p className="text-gray-300 text-sm mb-2">
                   Your subscription is active.
                </p>
                {subscriptionData?.next_billing_date && (
                  <p className="text-gray-400 text-xs">
                    Next billing: {new Date(subscriptionData.next_billing_date).toLocaleDateString()}
                  </p>
                )}
             </div>
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
                      custom_id: user.id 
                    });
                  }}
                  onApprove={handleApprove}
                  onError={(err: any) => {
                    console.error("PayPal Error Object:", err);
                    alert("PayPal Error: " + (err.message || "Unknown error"));
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
    </section>
  );
}
