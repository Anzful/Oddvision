import Link from "next/link";
import React from "react";
import {
  IconBrandChrome,
  IconGhost,
  IconKeyboard,
  IconBolt,
  IconKey,
  IconScan,
  IconSparkles,
  IconEye,
} from "@tabler/icons-react";
import Reveal from "../components/Reveal";
import PricingSection from "../components/PricingSection";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="ov-hero">
        <div className="ov-hero-bg" aria-hidden="true"></div>
        <div className="ov-container">
          <h1 className="ov-hero-title">Stealth AI overlay for any webpage</h1>
          <p className="ov-hero-subtitle">
            No copy-pasting. No switching tabs. Just press <kbd>Alt</kbd>+
            <kbd>1</kbd> to capture and <kbd>Alt</kbd>+<kbd>2</kbd> to ask.
            It&apos;s that simple.
          </p>
          <div className="ov-cta">
            <a
              id="installPrimary"
              className="ov-btn ov-btn--primary"
              href="https://chromewebstore.google.com/detail/agckpadpigmebffnhleebpkllfpbggge?utm_source=item-share-cb"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconBrandChrome style={{ marginRight: 8 }} />
              Add to Chrome
            </a>
          </div>
          <div className="ov-kbd-grid">
            <div className="ov-kbd-item">
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>1</kbd>
              <span className="ov-kbd-label">Capture</span>
            </div>
            <div className="ov-kbd-item">
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>2</kbd>
              <span className="ov-kbd-label">Analyze</span>
            </div>
            <div className="ov-kbd-item">
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>3</kbd>
              <span className="ov-kbd-label">Overlay</span>
            </div>
            <div className="ov-kbd-item">
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>4</kbd>
              <span className="ov-kbd-label">Color</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="ov-section">
        <div className="ov-container">
          <h2 className="ov-section-title">Why Oddvision</h2>
          <div className="ov-grid">
            <Reveal className="ov-card">
              <div className="ov-card-icon">
                <IconGhost />
              </div>
              <h3>Stays out of your way</h3>
              <p>
                Small, transparent widget in the corner. It looks like nothing,
                but does everything.
              </p>
            </Reveal>
            <Reveal className="ov-card">
              <div className="ov-card-icon">
                <IconKeyboard />
              </div>
              <h3>Keyboard first</h3>
              <p>
                Capture, ask, and view with quick shortcuts. No mouse clicks
                required.
              </p>
            </Reveal>
            <Reveal className="ov-card">
              <div className="ov-card-icon">
                <IconBolt />
              </div>
              <h3>Always available</h3>
              <p>
                Smart technology (failover) ensures you get an answer, even if
                one AI provider is busy.
              </p>
            </Reveal>
            <Reveal className="ov-card">
              <div className="ov-card-icon">
                <IconKey />
              </div>
              <h3>No setup required</h3>
              <p>
                Everything is built-in. Just install and start using it
                immediately.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="ov-section">
        <div className="ov-container">
          <h2 className="ov-section-title">How it works</h2>
          <div className="ov-steps-container">
            <Reveal className="ov-step">
              <div className="ov-step-header">
                <span className="ov-step-num">01</span>
                <div className="ov-step-icon">
                  <IconScan />
                </div>
              </div>
              <h3>Capture</h3>
              <p>
                Press <kbd>Alt+1</kbd>. Oddvision silently reads the visible
                text on your screen.
              </p>
            </Reveal>
            {/* connector logic is handled by CSS ::before on container */}
            <Reveal className="ov-step">
              <div className="ov-step-header">
                <span className="ov-step-num">02</span>
                <div className="ov-step-icon">
                  <IconSparkles />
                </div>
              </div>
              <h3>Analyze</h3>
              <p>
                Press <kbd>Alt+2</kbd>. Your request flies to Groq (or
                OpenRouter) for an instant AI response.
              </p>
            </Reveal>
            {/* connector */}
            <Reveal className="ov-step">
              <div className="ov-step-header">
                <span className="ov-step-num">03</span>
                <div className="ov-step-icon">
                  <IconEye />
                </div>
              </div>
              <h3>View</h3>
              <p>
                Press <kbd>Alt+3</kbd>. The stealth overlay fades in with your
                answer. No tab switching.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Providers */}
      <section id="providers" className="ov-section">
        <div className="ov-container">
          <h2 className="ov-section-title">Providers & limits</h2>
          <div className="ov-providers">
            <Reveal className="ov-provider">
              <div className="ov-provider-head">
                <span className="ov-badge ov-badge--free">Free</span>
                <h3>Groq — Llama 3.3 70B</h3>
              </div>
              <ul className="ov-list">
                <li>~30 requests / minute</li>
                <li>~14,400 requests / day</li>
                <li>Ultra‑low latency</li>
              </ul>
            </Reveal>
            <Reveal className="ov-provider">
              <div className="ov-provider-head">
                <span className="ov-badge ov-badge--free">Free</span>
                <h3>OpenRouter — MiniMax M2</h3>
              </div>
              <ul className="ov-list">
                <li>~20 requests / minute (free)</li>
                <li>~200 requests / day (free models)</li>
                <li>Great backup capacity</li>
              </ul>
            </Reveal>
          </div>
          <p className="ov-note">
            Numbers may change over time. Oddvision automatically balances to
            stay responsive.
          </p>
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="ov-section">
        <div className="ov-container">
          <h2 className="ov-section-title">Use responsibly</h2>
          <Reveal className="ov-rules">
            <p>
              Oddvision is for research, learning, and productivity. Don’t abuse
              rate limits, spam, or try to bypass site rules. Respect content
              owners and local law.
            </p>
            <ul className="ov-list">
              <li>No automated scraping beyond what you actively view.</li>
              <li>No harmful, illegal, or abusive usage.</li>
              <li>API keys are built-in. No setup required.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="ov-section">
        <div className="ov-container">
          <h2 className="ov-section-title">Install Oddvision</h2>
          <div className="ov-install-grid">
            <Reveal className="ov-install-card">
              <h3>Chrome Web Store</h3>
              <p>
                One‑click install from the store. Updates land automatically.
              </p>
              <a
                id="storeLink"
                className="ov-btn ov-btn--primary"
                href="https://chromewebstore.google.com/detail/agckpadpigmebffnhleebpkllfpbggge?utm_source=item-share-cb"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Chrome Web Store
              </a>
              <p className="ov-mini-note">
                Available now on the official Chrome Web Store.
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
