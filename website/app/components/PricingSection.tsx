"use client";

import React, { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { IconCheck, IconCrown, IconArrowRight, IconInfinity, IconHeadset, IconSparkles } from "@tabler/icons-react";
import Reveal from "./Reveal";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID!;

const fetchProStatus = async (userId: string, retryCount = 0): Promise<any> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500; // ms
  
  console.log('[fetchProStatus] Starting query for user:', userId, 'attempt:', retryCount + 1);
  
  try {
    const { data: usage, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('[fetchProStatus] Query completed:', { usage, error });
    
    if (error) {
      console.error("[fetchProStatus] Error fetching usage:", error);
      // Retry on error if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        console.log('[fetchProStatus] Retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchProStatus(userId, retryCount + 1);
      }
      return null;
    }
    return usage;
  } catch (err) {
    console.error("[fetchProStatus] Exception:", err);
    // Retry on exception if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log('[fetchProStatus] Retrying after exception...');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchProStatus(userId, retryCount + 1);
    }
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
    let hasReceivedEvent = false;
    let isProcessing = false;
    console.log('[PricingSection] useEffect started, mounted:', mounted);

    const handleAuthChange = async (event: string, currentUser: User | null) => {
      console.log('[PricingSection] handleAuthChange called:', { event, userId: currentUser?.id, mounted, isProcessing });
      
      if (!mounted) {
        console.log('[PricingSection] Not mounted, returning early');
        return;
      }

      // Prevent duplicate processing
      if (isProcessing) {
        console.log('[PricingSection] Already processing, skipping');
        return;
      }
      isProcessing = true;
      
      setUser(currentUser);

      if (currentUser) {
        console.log('[PricingSection] Fetching pro status for user:', currentUser.id);
        const usage = await fetchProStatus(currentUser.id);
        console.log('[PricingSection] Pro status fetched:', usage, 'mounted:', mounted);
        
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
        console.log('[PricingSection] No user, clearing state');
        if (mounted) {
          setIsPro(false);
          setSubscriptionData(null);
        }
      }
      
      if (mounted) {
        console.log('[PricingSection] Setting loading to false');
        setLoading(false);
      }
      isProcessing = false;
    };

    console.log('[PricingSection] Setting up onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[PricingSection] onAuthStateChange fired:', { event, hasSession: !!session, userId: session?.user?.id });
      hasReceivedEvent = true;
      
      if (!mounted) {
        console.log('[PricingSection] onAuthStateChange - not mounted, returning');
        return;
      }
      
      const currentUser = session?.user ?? null;
      await handleAuthChange(event, currentUser);
    });
    console.log('[PricingSection] onAuthStateChange listener set up');

    // Fallback: manually check session if no event fires within 100ms
    const fallbackTimeout = setTimeout(async () => {
      if (!hasReceivedEvent && mounted && !isProcessing) {
        console.log('[PricingSection] No auth event received, manually checking session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[PricingSection] Manual session check result:', { hasSession: !!session, userId: session?.user?.id });
        
        if (mounted && !hasReceivedEvent) {
          await handleAuthChange('MANUAL_CHECK', session?.user ?? null);
        }
      }
    }, 100);

    return () => {
      console.log('[PricingSection] Cleanup - unmounting');
      mounted = false;
      isProcessing = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleApprove = async (data: any) => {
    try {
      const response = await fetch('/api/subscription/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        alert(`Payment successful, but account update failed: ${errorData.error || "Unknown error"}. Please contact support.`);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const features = [
    { icon: IconInfinity, text: "Unlimited AI analysis" },
    { icon: IconHeadset, text: "Priority support" },
    { icon: IconSparkles, text: "Early access to new features" },
  ];

  return (
    <section id="pricing" className="section">
      <div className="container">
        <Reveal>
          <div className="section-header" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
            <span className="section-label">Pricing</span>
            <h2 className="section-title" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Upgrade to Pro</h2>
            <p className="section-subtitle" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
              Remove all limits and unlock premium features.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="pricing-wrapper">
            <div className="pricing-card">
              {!isPro && !loading && (
                <div className="pricing-popular">50% OFF</div>
              )}

              <h3 className="pricing-name">Monthly Pro</h3>
              
              <div className="pricing-price">
                <span className="pricing-amount">$7.50</span>
                <span className="pricing-original">$14.99</span>
              </div>
              <p className="pricing-period">per month, billed monthly</p>

              <ul className="pricing-features">
                {features.map((feature, index) => (
                  <li key={index}>
                    <span className="pricing-check">
                      <IconCheck size={14} />
                    </span>
                    {feature.text}
                  </li>
                ))}
              </ul>

              {loading ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '32px 0',
                  gap: '12px',
                  color: 'var(--white-dim)'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid var(--border)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Loading...
                </div>
              ) : isPro ? (
                <div className="pricing-pro-status">
                  <div className="pricing-pro-title">
                    <IconCrown size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    You&apos;re Pro
                  </div>
                  <p className="pricing-pro-text">Your subscription is active.</p>
                  {subscriptionData?.next_billing_date && (
                    <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--white-muted)' }}>
                      Next billing: {new Date(subscriptionData.next_billing_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : user ? (
                <div style={{ marginTop: '8px' }}>
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
                        console.error("PayPal Error:", err);
                        alert("PayPal Error: " + (err.message || "Unknown error"));
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              ) : (
                <div className="pricing-login-prompt">
                  <p>Log in to subscribe</p>
                  <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                    Log In to Subscribe
                    <IconArrowRight size={18} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
