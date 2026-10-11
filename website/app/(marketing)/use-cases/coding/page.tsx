import React from "react";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";

const PATH = "/use-cases/coding";
export const metadata: Metadata = pageMetadata(PATH);

export default function Coding() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Use cases", path: "/use-cases" },
        { name: "Coding", path: PATH },
      ]}
      heading="Explain code and error messages without leaving the page"
      lead="When you hit an error in the browser console, a GitHub file you don't understand, or a wall of documentation, Oddvision explains it in place."
      related={["/use-cases/charts-and-images", "/use-cases/reading-and-research", "/how-it-works"]}
    >
      <section className="privacy-section">
        <h2>Error messages and stack traces</h2>
        <p>
          Press <Kbd>Alt+4</Kbd> and drag a box around the error in DevTools, a terminal in your browser or a CI log. The
          Explainer tells you what the error means and the most likely fix. Snipping works even where text is hard to
          select, such as console panels and screenshots of logs.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Unfamiliar code</h2>
        <p>
          On a GitHub file, a pull request or a Stack Overflow answer, snip the function you&apos;re reading with{" "}
          <Kbd>Alt+4</Kbd> to get a walk-through of what it does. For a short page, <Kbd>Alt+1</Kbd> then <Kbd>Alt+2</Kbd>{" "}
          works too. It&apos;s handy for regular expressions, SQL queries and shell one-liners.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Long documentation</h2>
        <p>
          The Summarizer pulls out the parts of an API reference or a changelog that matter: required parameters, breaking
          changes and examples. If you always want answers in a certain form, save it as a Custom role, such as
          &ldquo;show the minimal example in TypeScript&rdquo;.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Keep secrets out of captures</h2>
        <p>
          Captured text and screenshots are sent to the AI to answer you and aren&apos;t stored, but it&apos;s still good
          practice not to capture pages that show API keys, passwords or customer data.
        </p>
      </section>
    </ContentPage>
  );
}
