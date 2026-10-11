import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";
import { ROLES, SHORTCUTS, SITE } from "@/lib/site";

const PATH = "/how-it-works";
export const metadata: Metadata = pageMetadata(PATH);

export default function HowItWorks() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[{ name: "How it works", path: PATH }]}
      heading="How Oddvision works"
      lead={
        <>
          Oddvision is a Chrome extension that answers questions about the page you&apos;re on. You press a
          shortcut, it reads the page or a part of your screen, and the AI&apos;s answer appears in a small overlay
          on top of the page. There&apos;s no tab switching and nothing to copy and paste.
        </>
      }
      related={["/use-cases", "/faq", "/compare/oddvision-vs-chatgpt"]}
    >
      <section className="privacy-section">
        <h2>1. Install and sign in</h2>
        <p>
          Add Oddvision from the <a href={SITE.chromeStoreUrl} target="_blank" rel="noopener noreferrer">Chrome Web Store</a>,
          then open the extension&apos;s popup and sign in with Google. There are no API keys to set up. The free plan includes{" "}
          {SITE.freeDailyAnalyses} AI analyses a day.
        </p>
      </section>

      <section className="privacy-section">
        <h2>2. Use the four shortcuts</h2>
        <p>Everything runs from the keyboard. On a Mac, Alt is the Option key.</p>
        <table className="ov-permissions-table">
          <thead>
            <tr>
              <th>Shortcut</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}>
                <td>
                  <Kbd>{s.keys}</Kbd> {s.action}
                </td>
                <td>{s.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          A typical question takes two key presses: <Kbd>Alt+1</Kbd> to capture the page, then <Kbd>Alt+2</Kbd> to get the
          answer. For anything that isn&apos;t plain text, such as a chart, a diagram, a photo of handwriting or a code
          screenshot, use <Kbd>Alt+4</Kbd> and drag a box around it.
        </p>
      </section>

      <section className="privacy-section">
        <h2>3. Pick an AI role</h2>
        <p>
          Roles change how the AI answers. Switch roles by clicking a role icon at the top of the overlay, and choose
          which roles appear in the extension&apos;s settings.
        </p>
        <table className="ov-permissions-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.name}>
                <td>
                  {r.icon} {r.name}
                </td>
                <td>{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="privacy-section">
        <h2>Tips for better answers</h2>
        <ul>
          <li>
            <Kbd>Alt+1</Kbd> reads the page&apos;s text from the top, up to about 4,000 characters (roughly 600 words). For
            something further down a long page, snip it with <Kbd>Alt+4</Kbd> instead.
          </li>
          <li>Use Explainer when you want to understand something, and Summarizer when you only need the key points.</li>
          <li>Save instructions you repeat, such as &ldquo;translate to English&rdquo; or &ldquo;answer in two sentences&rdquo;, as a Custom role.</li>
          <li>
            Shortcuts clash with another app? Change them at <code>chrome://extensions/shortcuts</code>.
          </li>
          <li>AI can be wrong. Check anything important, especially numbers read from images.</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>What happens to your data</h2>
        <p>
          Text and screenshots you capture are sent to {SITE.aiModel} to produce the answer, then discarded. Oddvision
          stores only usage metadata (the time, the AI model and the length of the request), never the content itself.
          The extension asks for three permissions: <code>activeTab</code>, <code>storage</code> and <code>identity</code>.
          Details are in the <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>
    </ContentPage>
  );
}
