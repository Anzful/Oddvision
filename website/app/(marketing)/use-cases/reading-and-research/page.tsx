import React from "react";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";

const PATH = "/use-cases/reading-and-research";
export const metadata: Metadata = pageMetadata(PATH);

export default function ReadingAndResearch() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Use cases", path: "/use-cases" },
        { name: "Reading and research", path: PATH },
      ]}
      heading="Summarize any webpage or long article with AI"
      lead="A news article, a report page or a privacy policy nobody reads: Oddvision gives you the key points in seconds, on the page itself."
      related={["/use-cases/studying", "/use-cases/writing", "/compare/oddvision-vs-chatgpt"]}
    >
      <section className="privacy-section">
        <h2>Get the key points</h2>
        <p>
          Switch to the Summarizer role, press <Kbd>Alt+1</Kbd> to capture the page and <Kbd>Alt+2</Kbd> to summarize.{" "}
          <Kbd>Alt+1</Kbd> reads up to about 4,000 characters from the top of the page, roughly 600 words. For a later
          section of a long document, snip that section with <Kbd>Alt+4</Kbd> and summarize it on its own.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Decode jargon in place</h2>
        <p>
          Financial news, legal text and research papers are full of terms that stop you mid-sentence. The Explainer
          defines them in the context of the article you&apos;re reading, not in the abstract.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Terms of service and policies</h2>
        <p>
          Before you accept, capture the terms and ask for what matters to you: cancellation rules, auto-renewal, data
          sharing and fees. Treat the summary as a guide, not legal advice, and read the clauses it points to.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Pages in other languages</h2>
        <p>
          Create a Custom role such as &ldquo;Summarize in English&rdquo; and use it on news sites, forums or documents in
          any language the AI understands.
        </p>
      </section>
    </ContentPage>
  );
}
