import React from "react";
import type { Metadata } from "next";
import ContentPage from "../../components/ContentPage";
import { faqLd, pageMetadata } from "@/lib/seo";
import { ROLES, SITE } from "@/lib/site";

const PATH = "/faq";
export const metadata: Metadata = pageMetadata(PATH);

/** Plain-text answers: also used verbatim in the FAQPage structured data. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Oddvision?",
    a: "Oddvision is a Chrome extension that puts an AI assistant on any webpage. You press a keyboard shortcut to capture the page or snip part of the screen, and the AI's answer appears in an overlay on the same page, so you never have to copy text into a separate chat.",
  },
  {
    q: "How do I use it?",
    a: "Alt+1 captures the page's text, Alt+2 sends it to the AI, Alt+3 hides or shows the answer overlay, and Alt+4 lets you drag a box around any part of the screen (a chart, diagram, image or code) and get an answer about it. On a Mac, Alt is the Option key.",
  },
  {
    q: "Is Oddvision free?",
    a: `Yes. The free plan includes ${SITE.freeDailyAnalyses} AI analyses a day. Oddvision Pro costs ${SITE.pro.label} and removes the daily limit.`,
  },
  {
    q: "Which browsers does it work in?",
    a: "Oddvision is a Google Chrome extension for desktop: Windows, macOS, Linux and ChromeOS. Install it from the Chrome Web Store.",
  },
  {
    q: "Which AI model does Oddvision use?",
    a: `Oddvision uses ${SITE.aiModel}. You don't need your own API key.`,
  },
  {
    q: "How much of a page does Alt+1 capture?",
    a: "Alt+1 reads the page's text from the top, skipping hidden elements, up to about 4,000 characters (roughly 600 words). To ask about something further down a long page, snip it with Alt+4.",
  },
  {
    q: "Does Oddvision store what I capture?",
    a: `No. Captured text and screenshots are sent to ${SITE.aiModel} to produce the answer and then discarded. Oddvision stores only usage metadata: the time of the request, the AI model used and the length of the text.`,
  },
  {
    q: "What permissions does the extension need?",
    a: "Three: activeTab, to read the current page when you press a shortcut; storage, to save your settings in the browser; and identity, for Google sign-in.",
  },
  {
    q: "What are AI roles?",
    a: `Roles change how the AI answers. Oddvision has seven: ${ROLES.map((r) => `${r.name} (${r.detail.replace(/\.$/, "").toLowerCase()})`).join("; ")}. Switch roles by clicking a role icon in the overlay.`,
  },
  {
    q: "Can I change the keyboard shortcuts?",
    a: "Yes. Open chrome://extensions/shortcuts in Chrome and set new keys for Oddvision's four commands.",
  },
  {
    q: "Can I use Oddvision for studying?",
    a: "Yes. Students use it to explain concepts, summarize readings, and check practice problems step by step. Follow your school's rules on AI use; many courses allow AI for studying but not during graded work.",
  },
  {
    q: "How do I cancel Oddvision Pro?",
    a: "Open the Pricing section on oddvision.xyz while signed in and click Manage subscription. Pro stays active until the end of the period you've paid for. Refunds are available within 14 days of a payment.",
  },
  {
    q: "Who makes Oddvision?",
    a: `Oddvision is an independent product. Payments are handled by Paddle, the merchant of record. Contact: ${SITE.email}.`,
  },
];

export default function Faq() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[{ name: "FAQ", path: PATH }]}
      heading="Frequently asked questions"
      lead="Quick answers about what Oddvision does, what it costs, and what happens to your data."
      related={["/how-it-works", "/use-cases", "/privacy"]}
      extraLd={[faqLd(FAQ)]}
    >
      <section className="privacy-section content-faq">
        {FAQ.map(({ q, a }) => (
          <details key={q} open>
            <summary>
              <h2 style={{ display: "inline", fontSize: 17, fontWeight: 600, margin: 0 }}>{q}</h2>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </ContentPage>
  );
}
