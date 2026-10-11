"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckoutEventNames, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { supabase } from "../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { IconCheck, IconCrown, IconArrowRight, IconInfinity, IconHeadset, IconSparkles, IconLock } from "@tabler/icons-react";
import Reveal from "./Reveal";
import { PADDLE_PUBLIC, isPaddleConfigured } from "../../lib/paddle-config";

import { fetchProStatusDirect, isRowPro, type UsageRow } from "../../lib/usage-client";

const PRICE_LABEL = "$8.00";

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
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState(false);
  const [checkoutOpening, setCheckoutOpening] = useState(false);
  const checkoutOpeningRef = useRef(false);
  const checkoutOwnerRef = useRef<string | null>(null);
  const [purchasePending, setPurchasePending] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const statusRequestRef = useRef(0);
  const confirmingRef = useRef<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);

  const refreshStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== userIdRef.current) return null;
    const requestId = ++statusRequestRef.current;
    try {
      const usage = await fetchProStatusDirect(session.user.id, session.access_token);
      if (session.user.id !== userIdRef.current || requestId !== statusRequestRef.current) return null;
      setStatusError(null);
      setSubscriptionData(usage);
      setIsPro(isRowPro(usage));
      window.dispatchEvent(new Event('oddvision:subscription-updated'));
      return usage;
    } catch (err) {
      if (requestId === statusRequestRef.current && session.user.id === userIdRef.current) {
        setStatusError(err instanceof Error ? err.message : 'Could not load your subscription.');
      }
      return null;
    } finally {
      if (requestId === statusRequestRef.current && session.user.id === userIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentRevision = ++statusRequestRef.current;
      const currentUser = session?.user ?? null;
      if (userIdRef.current !== (currentUser?.id ?? null)) {
        setPurchasePending(false);
        setActivating(false);
        setNotice(null);
      }
      userIdRef.current = currentUser?.id ?? null;
      setUser(currentUser);
      setStatusError(null);
      setIsPro(false);
      setSubscriptionData(null);
      setLoading(Boolean(session));
      if (!session) return;
      // Do not return a promise to the auth callback or drop newer auth events.
      void fetchProStatusDirect(session.user.id, session.access_token).then((usage) => {
        if (!mounted || statusRequestRef.current !== currentRevision) return;
        setIsPro(isRowPro(usage));
        setSubscriptionData(usage);
      }).catch((err) => {
        if (mounted && statusRequestRef.current === currentRevision) setStatusError(err.message);
      }).finally(() => {
        if (mounted && statusRequestRef.current === currentRevision) setLoading(false);
      });
    });
    return () => {
      mounted = false;
      userIdRef.current = null;
      subscription.unsubscribe();
    };
  }, []);

  // After payment, ask our server to verify the transaction with Paddle and
  // turn Pro on. Paddle can take a few seconds to create the subscription, so
  // poll briefly; the webhook will finish the job if this times out.
  const confirmPurchase = useCallback(async (transactionId: string) => {
    const ownerId = userIdRef.current;
    if (!ownerId || confirmingRef.current === transactionId) return;
    confirmingRef.current = transactionId;
    sessionStorage.setItem(`paddle-pending:${ownerId}`, transactionId);
    setPurchasePending(true);
    setActivating(true);
    setNotice({ kind: 'info', text: 'Payment received — activating Pro…' });

    for (let attempt = 0; attempt < 15; attempt++) {
      if (userIdRef.current !== ownerId) break;
      try {
        const token = await getAccessToken();
        if (!token) break;
        const res = await fetch('/api/paddle/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transactionId }),
          signal: AbortSignal.timeout(10000),
        });
        const result = await res.json().catch(() => ({}));
        if (userIdRef.current !== ownerId) break;
        if (res.ok && result.isPro) {
          sessionStorage.removeItem(`paddle-pending:${ownerId}`);
          setPurchasePending(false);
          await refreshStatus();
          setActivating(false);
          confirmingRef.current = null;
          setNotice({ kind: 'success', text: 'You’re Pro! Your extension will pick it up automatically.' });
          return;
        }
        if (res.status === 401 || res.status === 403) break;
      } catch (err) {
        console.error('[PricingSection] sync attempt failed', err);
      }
      await sleep(2000);
    }

    confirmingRef.current = null;
    if (userIdRef.current !== ownerId) {
      setActivating(false);
      setPurchasePending(false);
      return;
    }
    // Fall back to whatever the webhook has written by now.
    const usage = await refreshStatus();
    setActivating(false);
    if (isRowPro(usage)) {
      sessionStorage.removeItem(`paddle-pending:${ownerId}`);
      setPurchasePending(false);
    }
    setNotice(
      isRowPro(usage)
        ? { kind: 'success', text: 'You’re Pro! Your extension will pick it up automatically.' }
        : { kind: 'info', text: 'Payment received. Activation is still pending — refresh this page shortly. If it doesn’t, email oddvisionai@gmail.com.' }
    );
  }, [refreshStatus]);

  const signedInUserId = user?.id;
  useEffect(() => {
    if (!signedInUserId) return;
    const pending = sessionStorage.getItem(`paddle-pending:${signedInUserId}`);
    if (pending) void confirmPurchase(pending);
  }, [signedInUserId, confirmPurchase]);

  // Paddle's event callback is registered once, so route it through a ref.
  const confirmRef = useRef(confirmPurchase);
  useEffect(() => { confirmRef.current = confirmPurchase; }, [confirmPurchase]);

  useEffect(() => {
    if (!isPaddleConfigured()) {
      console.error('[PricingSection] Paddle is not configured (NEXT_PUBLIC_PADDLE_CLIENT_TOKEN / NEXT_PUBLIC_PADDLE_PRICE_ID)');
      return;
    }
    let cancelled = false;
    initializePaddle({
      environment: PADDLE_PUBLIC.environment,
      token: PADDLE_PUBLIC.clientToken,
      pwCustomer: {},
      checkout: { settings: { displayMode: 'overlay', theme: 'dark', allowLogout: false } },
      eventCallback: (event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED && event.data?.transaction_id) {
          const owner = checkoutOwnerRef.current;
          if (owner) sessionStorage.setItem(`paddle-pending:${owner}`, event.data.transaction_id);
          if (!owner || owner === userIdRef.current) void confirmRef.current(event.data.transaction_id);
        }
      },
    })
      .then((instance) => {
        if (cancelled) return;
        if (instance) setPaddle(instance);
        else setCheckoutError(true);
      })
      .catch((err) => {
        console.error('[PricingSection] Paddle failed to load', err);
        if (!cancelled) setCheckoutError(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Paddle Retain identifies signed-in customers by their Paddle customer id.
  const paddleCustomerId = subscriptionData?.paddle_customer_id ?? null;
  useEffect(() => {
    paddle?.Update({ pwCustomer: paddleCustomerId ? { id: paddleCustomerId } : {} });
  }, [paddle, paddleCustomerId]);

  const openCheckout = async () => {
    if (!paddle || !user || loading || statusError || purchasePending || isPro || checkoutOpeningRef.current ||
        (subscriptionData?.paddle_subscription_id && subscriptionData.subscription_status !== 'canceled')) return;
    checkoutOpeningRef.current = true;
    setCheckoutOpening(true);
    setNotice(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userIdRef.current) return;
      // Refresh before opening: another tab may already have completed a purchase.
      const requestId = ++statusRequestRef.current;
      const usage = await fetchProStatusDirect(session.user.id, session.access_token);
      if (session.user.id !== userIdRef.current || requestId !== statusRequestRef.current) return;
      setSubscriptionData(usage);
      setIsPro(isRowPro(usage));
      if (isRowPro(usage) || (usage?.paddle_subscription_id && usage.subscription_status !== 'canceled')) return;
      checkoutOwnerRef.current = session.user.id;
      paddle.Checkout.open({
        items: [{ priceId: PADDLE_PUBLIC.priceId, quantity: 1 }],
        ...(usage?.paddle_customer_id ? { customer: { id: usage.paddle_customer_id } }
          : session.user.email ? { customer: { email: session.user.email } } : {}),
        customData: { user_id: session.user.id },
      });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not open checkout. Please try again.' });
    } finally {
      checkoutOpeningRef.current = false;
      setCheckoutOpening(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setNotice(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in again');
      const res = await fetch('/api/paddle/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
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
              <p className="pricing-period">per month + tax · cancel anytime</p>

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
              ) : statusError ? (
                <p role="alert">{statusError}</p>
              ) : isPro || (hasPaddleSubscription && status !== 'canceled') ? (
                <div className="pricing-pro-status">
                  <div className="pricing-pro-title">
                    <IconCrown size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    {isPro ? 'You’re Pro' : 'Manage your subscription'}
                  </div>
                  <p className="pricing-pro-text">
                    {status === 'past_due'
                      ? 'Your last payment failed — please update your payment method to keep Pro.'
                      : cancelAt
                        ? (isPro ? `Canceled — Pro stays active until ${formatDate(cancelAt)}.` : 'Your paid period has ended. Manage your subscription below.')
                        : status === 'paused' ? 'Your subscription is paused. Manage it below.'
                        : isPro ? 'Your subscription is active.' : 'Manage your existing subscription below, or contact us if your payment has not activated Pro.'}
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
                </div>
              ) : user && !isPaddleConfigured() ? (
                // Deployed before Paddle keys are set (e.g. while Paddle reviews the domain).
                <div className="pricing-login-prompt">
                  <p>Checkout is opening soon.</p>
                  <a href="mailto:oddvisionai@gmail.com" className="btn btn-secondary" style={{ width: '100%' }}>
                    Email us to get Pro now
                  </a>
                </div>
              ) : user && purchasePending ? (
                <p role="status">Your payment is still being verified. Refresh this page to check again, or email oddvisionai@gmail.com.</p>
              ) : user && checkoutError ? (
                <p role="alert">Checkout could not load. Refresh the page or email oddvisionai@gmail.com.</p>
              ) : user ? (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={openCheckout}
                    disabled={!paddle || checkoutOpening}
                  >
                    {checkoutOpening ? 'Checking subscription…' : paddle ? 'Subscribe' : 'Loading checkout…'}
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
