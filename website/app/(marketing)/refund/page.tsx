import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy — Oddvision",
};

export default function Refund() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1>Refund Policy</h1>
        <span className="privacy-date">Last updated: {LEGAL.lastUpdated}</span>

        <section className="privacy-section">
          <h2>Who processes refunds</h2>
          <p>
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
            Merchant of Record for all our orders, provides all customer service inquiries and
            handles returns. Refunds are paid back to your original payment method by Paddle.
          </p>
        </section>

        <section className="privacy-section">
          <h2>{LEGAL.refundDays}-day money-back guarantee</h2>
          <p>
            If {LEGAL.brand} Pro isn&apos;t right for you, you can request a full refund within{" "}
            {LEGAL.refundDays} days of your first payment, or within {LEGAL.refundDays} days of a
            renewal payment, no questions asked.
          </p>
          <p>
            After {LEGAL.refundDays} days a payment is non-refundable, but you can cancel at any time
            to stop future renewals. Pro then stays active until the end of the period you paid for.
          </p>
        </section>

        <section className="privacy-section">
          <h2>How to request a refund</h2>
          <ul>
            <li>
              Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the address you signed up
              with, or
            </li>
            <li>
              Reply to your Paddle receipt email, or contact Paddle directly at{" "}
              <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a>.
            </li>
          </ul>
          <p>
            Refunds are usually processed within 5 business days. When we refund a payment we also
            cancel the subscription, so you won&apos;t be charged again.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Your statutory rights</h2>
          <p>
            This policy does not affect any rights you have under the consumer laws of your country.
            See also our <Link href="/terms">Terms of Service</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
