import React from "react";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";

const PATH = "/use-cases/writing";
export const metadata: Metadata = pageMetadata(PATH);

export default function Writing() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Use cases", path: "/use-cases" },
        { name: "Writing", path: PATH },
      ]}
      heading="Draft replies and rewrite text with AI in Chrome"
      lead="Oddvision's Writer role reads the email or document in front of you and drafts a reply, or rewrites a passage in the tone you need."
      related={["/use-cases/reading-and-research", "/how-it-works", "/faq"]}
    >
      <section className="privacy-section">
        <h2>Reply to an email</h2>
        <p>
          Open the message in Gmail or Outlook on the web and switch to the Writer role. Snip the message with{" "}
          <Kbd>Alt+4</Kbd>, or capture the page with <Kbd>Alt+1</Kbd> and press <Kbd>Alt+2</Kbd>. You get a draft reply
          based on what the sender actually asked. Edit it, paste it in and send.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Rewrite for tone and length</h2>
        <p>
          Snip the paragraph you want changed with <Kbd>Alt+4</Kbd>, then ask the Writer to make it shorter, friendlier
          or more formal.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Write in your own voice</h2>
        <p>
          Save a Custom role with your preferences, for example &ldquo;British English, no exclamation marks, under 80
          words&rdquo;, and every draft follows them.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Always review before sending</h2>
        <p>
          AI drafts can misread intent or invent details. Read every draft before it goes out, and don&apos;t capture
          messages containing information you&apos;re not allowed to share.
        </p>
      </section>
    </ContentPage>
  );
}
