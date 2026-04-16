import React from "react";
import {
  IconBrandChrome,
  IconEyeOff,
  IconCommand,
  IconBolt,
  IconPlugConnected,
  IconCapture,
  IconBrain,
  IconLayoutBottombar,
  IconArrowRight,
  IconRocket,
  IconCheck,
  IconShield,
  IconScreenshot,
  IconMask,
} from "@tabler/icons-react";
import Reveal from "../components/Reveal";
import PricingSection from "../components/PricingSection";

export default function Home() {
  return (
    <>
      {/* Background Elements */}
      <div className="bg-grid" />
      <div className="bg-gradient" />

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <Reveal>
                <div className="hero-badge">
                  <span>Chrome Extension — Available Now</span>
                </div>
              </Reveal>
              
              <Reveal delay={1}>
                <h1 className="hero-title">
                  Ghost mode<br />
                  <span className="hero-title-accent">AI assistant</span>
                </h1>
              </Reveal>
              
              <Reveal delay={2}>
                <p className="hero-subtitle">
                  An invisible AI overlay that lives on any webpage. Capture text with 
                  one keystroke, get instant AI analysis without ever leaving your tab.
                </p>
              </Reveal>
              
              <Reveal delay={3}>
                <div className="hero-cta">
                  <a
                    href="https://chromewebstore.google.com/detail/agckpadpigmebffnhleebpkllfpbggge?utm_source=item-share-cb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <IconBrandChrome size={20} />
                    Install for Chrome
                  </a>
                  <a href="#how" className="btn btn-secondary">
                    See how it works
                    <IconArrowRight size={18} />
                  </a>
                </div>
              </Reveal>

              <Reveal delay={4}>
                <div className="keyboard-hints">
                  <div className="kbd-item">
                    <span className="kbd">Alt</span>
                    <span style={{ color: 'var(--white-muted)' }}>+</span>
                    <span className="kbd">1</span>
                    <span className="kbd-label">Capture</span>
                  </div>
                  <div className="kbd-item">
                    <span className="kbd">Alt</span>
                    <span style={{ color: 'var(--white-muted)' }}>+</span>
                    <span className="kbd">2</span>
                    <span className="kbd-label">Analyze</span>
                  </div>
                  <div className="kbd-item">
                    <span className="kbd">Alt</span>
                    <span style={{ color: 'var(--white-muted)' }}>+</span>
                    <span className="kbd">3</span>
                    <span className="kbd-label">View</span>
                  </div>
                  <div className="kbd-item">
                    <span className="kbd">Alt</span>
                    <span style={{ color: 'var(--white-muted)' }}>+</span>
                    <span className="kbd">4</span>
                    <span className="kbd-label">Screenshot</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Hero Visual - Browser Mockup */}
            <div className="hero-visual">
              <Reveal delay={2}>
                <div className="hero-browser">
                  <div className="browser-bar">
                    <div className="browser-dot" />
                    <div className="browser-dot" />
                    <div className="browser-dot" />
                    <div className="browser-url">oddvision.xyz</div>
                  </div>
                  <div className="browser-content">
                    {/* Simulated webpage content - mirrors real site */}
                    <div className="fake-page">
                      <div className="fake-header">
                        <div className="fake-logo">Oddvision</div>
                        <div className="fake-nav">
                          <span>Features</span>
                          <span>Pricing</span>
                          <span>Install</span>
                        </div>
                      </div>
                      <div className="fake-article">
                        <h3 className="fake-article-title">Stealth AI overlay for any webpage</h3>
                        <p className="fake-article-meta">Chrome Extension · Free to use</p>
                        <p className="fake-article-text">
                          No copy-pasting. No switching tabs. Just press Alt+1 to capture 
                          and Alt+2 to ask. It&apos;s that simple.
                        </p>
                        <p className="fake-article-text">
                          Small, transparent widget in the corner. It looks like nothing, 
                          but does everything. Keyboard-first with quick shortcuts.
                        </p>
                      </div>
                    </div>
                    
                    {/* Extension Popup - positioned like real Chrome extension */}
                    <div className="extension-popup">
                      <img 
                        src="/1.png" 
                        alt="Oddvision Extension" 
                        className="extension-popup-img"
                      />
                    </div>

                    {/* Floating Widget */}
                    <div className="overlay-widget">
                      <div className="overlay-widget-header">
                        <div className="overlay-widget-dot" />
                        <span className="overlay-widget-title">Oddvision</span>
                      </div>
                      <p className="overlay-widget-text">
                        ✓ Page captured. AI analysis ready.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="section">
        <div className="container">
          <Reveal>
            <div className="section-header section-header-center">
              <span className="section-label">Features</span>
              <h2 className="section-title">Built for speed and stealth</h2>
              <p className="section-subtitle">
                Everything you need, nothing you don&apos;t. Zero configuration required.
              </p>
            </div>
          </Reveal>

          <div className="features-grid">
            <Reveal className="feature-card feature-card-large" delay={1}>
              <div className="feature-card-glow" />
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <IconEyeOff size={32} />
                </div>
                <div className="feature-icon-ring" />
              </div>
              <h3 className="feature-title">Invisible by design</h3>
              <p className="feature-text">
                A tiny, transparent widget in the corner that appears only when you need it. 
                Completely undetectable, blends into any webpage seamlessly.
              </p>
              <div className="feature-tag">Ghost Mode</div>
            </Reveal>

            <Reveal className="feature-card" delay={2}>
              <div className="feature-card-glow" />
              <div className="feature-icon-wrapper">
                <div className="feature-icon feature-icon-cyan">
                  <IconCommand size={28} />
                </div>
              </div>
              <h3 className="feature-title">Keyboard-first</h3>
              <p className="feature-text">
                Four shortcuts is all you need. Capture, analyze, view, and screenshot
                without touching your mouse.
              </p>
              <div className="feature-keys">
                <span className="feature-key">Alt+1</span>
                <span className="feature-key">Alt+2</span>
                <span className="feature-key">Alt+3</span>
                <span className="feature-key">Alt+4</span>
              </div>
            </Reveal>

            <Reveal className="feature-card" delay={3}>
              <div className="feature-card-glow" />
              <div className="feature-icon-wrapper">
                <div className="feature-icon feature-icon-green">
                  <IconBolt size={28} />
                </div>
              </div>
              <h3 className="feature-title">Instant responses</h3>
              <p className="feature-text">
                Smart AI failover ensures you always
                get an answer, even during peak times.
              </p>
              <div className="feature-speed">
                <div className="feature-speed-bar" />
                <span>~200ms response</span>
              </div>
            </Reveal>

            <Reveal className="feature-card feature-card-wide" delay={4}>
              <div className="feature-card-glow" />
              <div className="feature-icon-wrapper">
                <div className="feature-icon feature-icon-purple">
                  <IconMask size={28} />
                </div>
              </div>
              <div className="feature-card-content">
                <h3 className="feature-title">AI Roles</h3>
                <p className="feature-text">
                  Switch between specialized AI modes on the fly. Each role shapes how the AI
                  reads and responds to your content — or create your own custom role.
                </p>
              </div>
              <div className="feature-checklist">
                <div className="feature-check"><IconCheck size={16} /> Picker</div>
                <div className="feature-check"><IconCheck size={16} /> Explainer</div>
                <div className="feature-check"><IconCheck size={16} /> Summarizer</div>
                <div className="feature-check"><IconCheck size={16} /> Writer</div>
                <div className="feature-check"><IconCheck size={16} /> Solver</div>
                <div className="feature-check"><IconCheck size={16} /> Custom</div>
              </div>
            </Reveal>

            <Reveal className="feature-card feature-card-wide" delay={5}>
              <div className="feature-card-glow" />
              <div className="feature-icon-wrapper">
                <div className="feature-icon feature-icon-orange">
                  <IconPlugConnected size={28} />
                </div>
              </div>
              <div className="feature-card-content">
                <h3 className="feature-title">Zero setup required</h3>
                <p className="feature-text">
                  No API keys needed. No configuration. Just install and start using 
                  immediately. Everything is built-in and ready to go.
                </p>
              </div>
              <div className="feature-checklist">
                <div className="feature-check"><IconCheck size={16} /> No API keys</div>
                <div className="feature-check"><IconCheck size={16} /> No config</div>
                <div className="feature-check"><IconCheck size={16} /> Works instantly</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section section-dark">
        <div className="container">
          <Reveal>
            <div className="section-header section-header-center">
              <span className="section-label">How it works</span>
              <h2 className="section-title">Four keystrokes to AI power</h2>
              <p className="section-subtitle">
                Simple, fast, and stays out of your way.
              </p>
            </div>
          </Reveal>

          <div className="steps-container">
            {/* Connection line */}
            <div className="steps-line">
              <div className="steps-line-progress" />
            </div>

            <div className="steps-grid">
              <Reveal className="step-card" delay={1}>
                <div className="step-header">
                  <div className="step-number-wrapper">
                    <span className="step-number">01</span>
                    <div className="step-number-glow" />
                  </div>
                  <div className="step-icon">
                    <IconCapture size={24} />
                  </div>
                </div>
                <h3 className="step-title">Capture</h3>
                <p className="step-text">
                  Press the shortcut to silently capture all visible text on the current page. 
                  No popups, no interruptions.
                </p>
                <div className="step-keyboard">
                  <div className="step-key">Alt</div>
                  <span className="step-key-plus">+</span>
                  <div className="step-key step-key-accent">1</div>
                </div>
              </Reveal>

              <Reveal className="step-card" delay={2}>
                <div className="step-header">
                  <div className="step-number-wrapper">
                    <span className="step-number">02</span>
                    <div className="step-number-glow" />
                  </div>
                  <div className="step-icon step-icon-cyan">
                    <IconBrain size={24} />
                  </div>
                </div>
                <h3 className="step-title">Analyze</h3>
                <p className="step-text">
                  Send to AI instantly. Lightning-fast inference
                  with smart failover built in.
                </p>
                <div className="step-keyboard">
                  <div className="step-key">Alt</div>
                  <span className="step-key-plus">+</span>
                  <div className="step-key step-key-cyan">2</div>
                </div>
              </Reveal>

              <Reveal className="step-card" delay={3}>
                <div className="step-header">
                  <div className="step-number-wrapper">
                    <span className="step-number">03</span>
                    <div className="step-number-glow" />
                  </div>
                  <div className="step-icon step-icon-green">
                    <IconLayoutBottombar size={24} />
                  </div>
                </div>
                <h3 className="step-title">View</h3>
                <p className="step-text">
                  Reveal the stealth overlay with your AI response.
                  No tab switching required. It just appears.
                </p>
                <div className="step-keyboard">
                  <div className="step-key">Alt</div>
                  <span className="step-key-plus">+</span>
                  <div className="step-key step-key-green">3</div>
                </div>
              </Reveal>

              <Reveal className="step-card" delay={4}>
                <div className="step-header">
                  <div className="step-number-wrapper">
                    <span className="step-number">04</span>
                    <div className="step-number-glow" />
                  </div>
                  <div className="step-icon step-icon-orange">
                    <IconScreenshot size={24} />
                  </div>
                </div>
                <h3 className="step-title">Screenshot</h3>
                <p className="step-text">
                  Select any region on screen to capture and send to AI
                  for visual analysis. Works with images, charts, and more.
                </p>
                <div className="step-keyboard">
                  <div className="step-key">Alt</div>
                  <span className="step-key-plus">+</span>
                  <div className="step-key step-key-orange">4</div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />


      {/* Rules */}
      <section id="rules" className="section">
        <div className="container">
          <div className="rules-wrapper">
            <Reveal>
              <div className="rules-header">
                <div className="rules-icon">
                  <IconShield size={32} />
                </div>
                <div>
                  <span className="section-label">Guidelines</span>
                  <h2 className="section-title">Use responsibly</h2>
                </div>
              </div>
            </Reveal>

            <Reveal delay={1}>
              <p className="rules-intro">
                Oddvision is designed for research, learning, and productivity. 
                Please respect the following guidelines to keep the service running for everyone.
              </p>
            </Reveal>

            <div className="rules-grid">
              <Reveal className="rule-item" delay={1}>
                <div className="rule-number">01</div>
                <div className="rule-content">
                  <h4>Fair Usage</h4>
                  <p>No automated scraping beyond what you actively view on screen</p>
                </div>
              </Reveal>
              <Reveal className="rule-item" delay={2}>
                <div className="rule-number">02</div>
                <div className="rule-content">
                  <h4>Ethical Use</h4>
                  <p>No harmful, illegal, or abusive usage of the AI capabilities</p>
                </div>
              </Reveal>
              <Reveal className="rule-item" delay={3}>
                <div className="rule-number">03</div>
                <div className="rule-content">
                  <h4>Respect Rights</h4>
                  <p>Respect content owners and comply with local laws</p>
                </div>
              </Reveal>
              <Reveal className="rule-item rule-item-highlight" delay={4}>
                <div className="rule-check"><IconCheck size={20} /></div>
                <div className="rule-content">
                  <h4>Zero Config</h4>
                  <p>API keys are built-in — no configuration or sharing required</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section id="install" className="section section-dark">
        <div className="container">
          <div className="cta-wrapper">
            <div className="cta-bg">
              <div className="cta-glow cta-glow-1" />
              <div className="cta-glow cta-glow-2" />
              <div className="cta-grid" />
            </div>
            
            <Reveal>
              <div className="cta-content">
                <div className="cta-badge">
                  <IconBrandChrome size={16} />
                  Chrome Extension
                </div>
                <h2 className="cta-title">Ready to try <span>Oddvision</span>?</h2>
                <p className="cta-text">
                  One click install. Updates automatically. Free to start.
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/agckpadpigmebffnhleebpkllfpbggge?utm_source=item-share-cb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button"
                >
                  <span className="cta-button-bg" />
                  <IconRocket size={20} />
                  Get Oddvision for Chrome
                  <IconArrowRight size={18} />
                </a>
                <div className="cta-features">
                  <div className="cta-feature">
                    <IconCheck size={16} />
                    Free to use
                  </div>
                  <div className="cta-feature">
                    <IconCheck size={16} />
                    Quick Google sign-in
                  </div>
                  <div className="cta-feature">
                    <IconCheck size={16} />
                    Auto updates
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
