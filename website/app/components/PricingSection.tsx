"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckoutEventNames, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { IconCheck, IconCrown, IconArrowRight, IconInfinity, IconHeadset, IconSparkles, IconLock } from "@tabler/icons-react";
import Reveal from "./Reveal";
import { PADDLE_PUBLIC, isPaddleConfigured } from "../../lib/paddle-config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? "";

// Paddle as soon as its keys are set; until then the PayPal bridge; otherwise neither.
const PROVIDER: 'paddle' | 'paypal' | 'none' = isPaddleConfigured()
  ? 'paddle'
  : PAYPAL_CLIENT_ID && PAYPAL_PLAN_ID ? 'paypal' : 'none';
// The PayPal label must match the PayPal plan's price.
const PRICE_LABEL = PROVIDER === 'paypal' ? process.env.NEXT_PUBLIC_PAYPAL_PRICE_LABEL || "$7.50" : "$7.69";
const PERIOD_LABEL = PROVIDER === 'paypal' ? "per month · cancel anytime" : "per month · tax included · cancel anytime";

type UsageRow = {
  is_pro?: boolean;
  pro_expires_at?: string | null;
  pro_granted_by?: string | null;
  next_billing_date?: string | null;
  subscription_status?: string | null;
  subscription_cancel_at?: string | null;
  paddle_subscription_id?: string | null;
  paypal_subscription_id?: string | null;
};

// Use direct REST API call instead of Supabase client to avoid hanging during session recovery
const fetchProStatusDirect = async (userId: string, accessToken: string): Promise<UsageRow | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_usage?user_id=eq.${userId}&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error('[fetchProStatusDirect] HTTP error:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('[fetchProStatusDirect]', err instanceof Error && err.name === 'AbortError' ? 'timed out after 10s' : err);
    return null;
  }
};

const isRowPro = (usage: UsageRow | null) =>
  !!usage?.is_pro && !(usage.pro_expires_at && new Date(usage.pro_expires_at) <= new Date());

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const getAccessToken = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PricingSection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<UsageRow | null>(null);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [activating, setActivating] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);

  const refreshStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const usage = await fetchProStatusDirect(session.user.id, session.access_token);
    setSubscriptionData(usage);
    setIsPro(isRowPro(usage));
    return usage;
  }, []);

  useEffect(() => {
    let mounted = true;
    let hasReceivedEvent = false;
    let isProcessing = false;

    const handleAuthChange = async (session: { user: User | null; access_token?: string } | null) => {
      if (!mounted || isProcessing) return;
      isProcessing = true;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser && session?.access_token) {
        const usage = await fetchProStatusDirect(currentUser.id, session.access_token);
        if (mounted) {
          setIsPro(isRowPro(usage));
          setSubscriptionData(usage);
        }
      } else if (mounted) {
        setIsPro(false);
        setSubscriptionData(null);
      }

      if (mounted) setLoading(false);
      isProcessing = false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      hasReceivedEvent = true;
      if (!mounted) return;
      await handleAuthChange(session ? { user: session.user, access_token: session.access_token } : null);
    });

    // Fallback: manually check session if no event fires within 100ms
    const fallbackTimeout = setTimeout(async () => {
      if (!hasReceivedEvent && mounted && !isProcessing) {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && !hasReceivedEvent) {
          await handleAuthChange(session ? { user: session.user, access_token: session.access_token } : null);
        }
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // After payment, ask our server to verify the purchase with the provider and
  // turn Pro on. The provider can take a few seconds to finish, so poll
  // briefly; the webhook will finish the job if this times out.
  const confirmPurchase = useCallback(async (endpoint: string, payload: Record<string, string>) => {
    setActivating(true);
    setNotice({ kind: 'info', text: 'Payment received — activating Pro…' });

    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const token = await getAccessToken();
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.isPro) {
          await refreshStatus();
          setActivating(false);
          setNotice({ kind: 'success', text: 'You’re Pro! Your extension will pick it up automatically.' });
          return;
        }
        if (res.status === 401 || res.status === 403) break;
      } catch (err) {
        console.error('[PricingSection] sync attempt failed', err);
      }
      await sleep(2000);
    }

    // Fall back to whatever the webhook has written by now.
    const usage = await refreshStatus();
    setActivating(false);
    setNotice(
      isRowPro(usage)
        ? { kind: 'success', text: 'You’re Pro! Your extension will pick it up automatically.' }
        : { kind: 'info', text: 'Payment received. Pro will switch on within a minute — refresh this page shortly. If it doesn’t, email oddvisionai@gmail.com.' }
    );
  }, [refreshStatus]);

  // Paddle's event callback is registered once, so route it through a ref.
  const confirmRef = useRef(confirmPurchase);
  useEffect(() => { confirmRef.current = confirmPurchase; }, [confirmPurchase]);

  useEffect(() => {
    if (PROVIDER !== 'paddle') return;
    let cancelled = false;
    initializePaddle({
      environment: PADDLE_PUBLIC.environment,
      token: PADDLE_PUBLIC.clientToken,
      checkout: { settings: { displayMode: 'overlay', theme: 'dark', allowLogout: false } },
      eventCallback: (event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED && event.data?.transaction_id) {
          confirmRef.current('/api/paddle/sync', { transactionId: event.data.transaction_id });
        }
      },
    })
      .then((instance) => { if (!cancelled && instance) setPaddle(instance); })
      .catch((err) => console.error('[PricingSection] Paddle failed to load', err));
    return () => { cancelled = true; };
  }, []);

  const openCheckout = () => {
    if (!paddle || !user) return;
    setNotice(null);
    paddle.Checkout.open({
      items: [{ priceId: PADDLE_PUBLIC.priceId, quantity: 1 }],
      ...(user.email ? { customer: { email: user.email } } : {}),
      customData: { user_id: user.id },
    });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setNotice(null);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/paddle/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.url) throw new Error(result.error || 'Could not open billing');
      window.location.href = result.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open billing';
      setNotice({ kind: 'error', text: `${message}. Please email oddvisionai@gmail.com.` });
      setPortalLoading(false);
    }
  };

  const features = [
    { icon: IconInfinity, text: "Unlimited AI analysis" },
    { icon: IconHeadset, text: "Priority support" },
    { icon: IconSparkles, text: "Early access to new features" },
  ];

  const status = subscriptionData?.subscription_status;
  const cancelAt = subscriptionData?.subscription_cancel_at;
  const hasPaddleSubscription = !!subscriptionData?.paddle_subscription_id;
  const hasPayPalSubscription = !hasPaddleSubscription && !!subscriptionData?.paypal_subscription_id;

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
              <h3 className="pricing-name">Monthly Pro</h3>

              <div className="pricing-price">
                <span className="pricing-amount">{PRICE_LABEL}</span>
              </div>
              <p className="pricing-period">{PERIOD_LABEL}</p>

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

              {loading || activating ? (
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
                  {activating ? 'Activating Pro…' : 'Loading...'}
                </div>
              ) : isPro ? (
                <div className="pricing-pro-status">
                  <div className="pricing-pro-title">
                    <IconCrown size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    You&apos;re Pro
                  </div>
                  <p className="pricing-pro-text">
                    {status === 'past_due'
                      ? 'Your last payment failed — please update your payment method to keep Pro.'
                      : cancelAt
                        ? `Canceled — Pro stays active until ${formatDate(cancelAt)}.`
                        : 'Your subscription is active.'}
                  </p>
                  {!cancelAt && subscriptionData?.next_billing_date && (
                    <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--white-muted)' }}>
                      Next billing: {formatDate(subscriptionData.next_billing_date)}
                    </p>
                  )}
                  {hasPaddleSubscription && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '16px' }}
                      onClick={openPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? 'Opening…' : status === 'past_due' ? 'Update payment method' : 'Manage subscription'}
                    </button>
                  )}
                  {hasPayPalSubscription && (
                    <a
                      href="https://www.paypal.com/myaccount/autopay/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '16px' }}
                    >
                      Manage in your PayPal account
                    </a>
                  )}
                </div>
              ) : user && PROVIDER === 'paypal' ? (
                // Temporary bridge while Paddle reviews the domain.
                <div style={{ marginTop: '8px' }}>
                  <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: "subscription" }}>
                    <PayPalButtons
                      style={{ shape: "rect", color: "gold", layout: "vertical", label: "subscribe" }}
                      createSubscription={(_data, actions) =>
                        actions.subscription.create({ plan_id: PAYPAL_PLAN_ID, custom_id: user.id })
                      }
                      onApprove={async (data) => {
                        if (data.subscriptionID) {
                          await confirmPurchase('/api/paypal/sync', { subscriptionId: data.subscriptionID });
                        }
                      }}
                      onError={(err) => {
                        console.error('[PricingSection] PayPal error', err);
                        setNotice({ kind: 'error', text: 'PayPal checkout failed. Please try again or email oddvisionai@gmail.com.' });
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              ) : user && PROVIDER === 'none' ? (
                // Deployed before any checkout is configured.
                <div className="pricing-login-prompt">
                  <p>Checkout is opening soon.</p>
                  <a href="mailto:oddvisionai@gmail.com" className="btn btn-secondary" style={{ width: '100%' }}>
                    Email us to get Pro now
                  </a>
                </div>
              ) : user ? (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={openCheckout}
                    disabled={!paddle}
                  >
                    {paddle ? 'Subscribe' : 'Loading checkout…'}
                    {paddle && <IconArrowRight size={18} />}
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--white-muted)', textAlign: 'center' }}>
                    <IconLock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    Card, Apple Pay, Google Pay or PayPal · Secure checkout by Paddle
                  </p>
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

              {notice && (
                <p
                  role="status"
                  style={{
                    marginTop: '16px',
                    fontSize: '14px',
                    textAlign: 'center',
                    color: notice.kind === 'error' ? '#ff5f57' : notice.kind === 'success' ? '#22c55e' : 'var(--white-dim)',
                  }}
                >
                  {notice.text}
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
