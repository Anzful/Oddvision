import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Oddvision",
};

export default function Terms() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1>Terms of Service</h1>
        <span className="privacy-date">Last updated: {LEGAL.lastUpdated}</span>

        <section className="privacy-section">
          <h2>1. About these terms</h2>
          <p>
            These terms govern your use of {LEGAL.brand}, a Chrome extension and website at{" "}
            <a href={LEGAL.website}>{LEGAL.website.replace("https://", "")}</a> that lets you capture
            webpage content and screenshots and analyze them with AI. {LEGAL.brand} is operated by{" "}
            {LEGAL.operator} (&quot;we&quot;, &quot;us&quot;). By installing the extension, creating an
            account or buying a subscription, you agree to these terms.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Payments and our reseller</h2>
          <p>
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
            Merchant of Record for all our orders. Paddle provides all customer service inquiries and
            handles returns. When you buy {LEGAL.brand} Pro, you are buying from Paddle, and your
            purchase is also subject to{" "}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
              Paddle&apos;s Buyer Terms
            </a>.
          </p>
        </section>

        <section className="privacy-section">
          <h2>3. Plans and billing</h2>
          <ul>
            <li><strong>Free:</strong> a limited number of AI analyses per day, at no cost.</li>
            <li>
              <strong>Pro:</strong> {LEGAL.price}, including applicable taxes. Pro removes the daily
              limit and includes priority support.
            </li>
            <li>
              Pro is a subscription that renews automatically every month until you cancel. You are
              charged at the start of each billing period.
            </li>
            <li>
              Accepted payment methods include card, Apple Pay, Google Pay and PayPal, depending on
              your country and device.
            </li>
            <li>
              We may change the price for future billing periods. We will notify you by email before a
              change takes effect, and you can cancel before it applies.
            </li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. Cancellation</h2>
          <p>
            You can cancel at any time from the Pricing section of our website (Manage subscription),
            or by contacting us. When you cancel, Pro stays active until the end of the period you
            have already paid for, and you will not be charged again. Refunds are covered by our{" "}
            <Link href="/refund">Refund Policy</Link>.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use {LEGAL.brand} to break any law, or the rules of any website, exam or institution you are subject to.</li>
            <li>Capture or submit content you do not have the right to process.</li>
            <li>Attempt to reverse engineer, overload, resell or bypass the limits of the service.</li>
            <li>Share your account with other people.</li>
          </ul>
          <p>
            You are responsible for how you use the AI responses. They can be wrong or incomplete, so
            check anything important before relying on it.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Availability and changes</h2>
          <p>
            We work to keep {LEGAL.brand} running reliably, but the service is provided &quot;as is&quot;
            and may occasionally be unavailable. We may add, change or remove features over time. If
            we discontinue Pro, we will refund any unused part of your current billing period.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Termination</h2>
          <p>
            We may suspend or close accounts that violate these terms. You can stop using{" "}
            {LEGAL.brand} at any time by uninstalling the extension and canceling your subscription.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. Limitation of liability</h2>
          <p>
            To the extent permitted by law, we are not liable for indirect or consequential losses, and
            our total liability for any claim is limited to the amount you paid us in the 12 months
            before the claim. Nothing in these terms limits rights you have under consumer protection
            law that cannot be waived.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. Privacy</h2>
          <p>
            How we handle your data is described in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. Contact</h2>
          <p>
            Questions about these terms? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
