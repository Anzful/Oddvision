import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";

const PATH = "/use-cases/studying";
export const metadata: Metadata = pageMetadata(PATH);

export default function Studying() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Use cases", path: "/use-cases" },
        { name: "Studying", path: PATH },
      ]}
      heading="An AI study helper that works on any page"
      lead="Textbook chapters, lecture slides, course pages and practice sets all live in your browser. Oddvision lets you ask about them where they are, instead of copying text into a separate chat."
      related={["/use-cases/reading-and-research", "/use-cases/charts-and-images", "/how-it-works"]}
    >
      <section className="privacy-section">
        <h2>Understand what you&apos;re reading</h2>
        <p>
          Stuck on a paragraph or a term? Press <Kbd>Alt+1</Kbd> to capture the page and <Kbd>Alt+2</Kbd> with the
          Explainer role. You get a plain-language explanation next to the text, so you can keep reading without losing
          your place.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Summarize readings before class or revision</h2>
        <p>
          The Summarizer role turns a long chapter or article into its key points. Use it to preview a reading before
          class, or to build revision notes from pages you&apos;ve already worked through.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Work through practice problems step by step</h2>
        <p>
          The Solver role shows each step of a math, physics or logic problem rather than just the result. Try the
          problem first, then compare your working with Oddvision&apos;s to find exactly where you went wrong.
        </p>
        <p>
          The steps matter. In a{" "}
          <a href="https://scale.stanford.edu/ai/repository/generative-ai-can-harm-learning" target="_blank" rel="noopener noreferrer">
            field study of about 1,000 high-school math students
          </a>
          , those who used an AI that just gave answers scored 17% lower once the AI was taken away, while a version that
          guided them with hints largely avoided that drop.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Diagrams, graphs and figures</h2>
        <p>
          Much of what&apos;s hard in STEM subjects is visual. Press <Kbd>Alt+4</Kbd>, drag a box around a graph, a cell
          diagram or a circuit, and ask what it shows. See <Link href="/use-cases/charts-and-images">charts and images</Link>{" "}
          for more.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Revising for exams</h2>
        <ul>
          <li>Summarize each topic&apos;s notes into a one-page list of key points.</li>
          <li>Ask the Explainer about the topics you keep getting wrong.</li>
          <li>Check your answers to practice papers with the Solver, step by step.</li>
        </ul>
        <p>
          Follow your school&apos;s rules on AI. Many courses allow it for studying but not during graded work.
        </p>
      </section>
    </ContentPage>
  );
}
