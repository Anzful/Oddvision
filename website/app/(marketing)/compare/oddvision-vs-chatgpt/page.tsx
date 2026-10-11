import React from "react";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const PATH = "/compare/oddvision-vs-chatgpt";
export const metadata: Metadata = pageMetadata(PATH);

const ROWS: { aspect: string; oddvision: React.ReactNode; chat: React.ReactNode }[] = [
  {
    aspect: "Getting page text to the AI",
    oddvision: (
      <>
        <Kbd>Alt+1</Kbd>, then <Kbd>Alt+2</Kbd>
      </>
    ),
    chat: "Select, copy, switch tabs, paste",
  },
  {
    aspect: "Charts, diagrams and images",
    oddvision: (
      <>
        <Kbd>Alt+4</Kbd> and drag over it
      </>
    ),
    chat: "Take a screenshot, then upload it",
  },
  { aspect: "Where the answer appears", oddvision: "In an overlay on the same page", chat: "In a separate tab or window" },
  { aspect: "Long conversations and follow-ups", oddvision: "Not designed for it: one answer per capture", chat: "Built for it" },
  { aspect: "Files, projects and history", oddvision: "No; answers aren't saved", chat: "Yes" },
  { aspect: "AI model", oddvision: SITE.aiModel, chat: "OpenAI's GPT models" },
  {
    aspect: "Price",
    oddvision: `Free (${SITE.freeDailyAnalyses} answers a day); Pro ${SITE.pro.label}`,
    chat: "Free tier and paid plans",
  },
];

export default function Compare() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Compare", path: PATH },
      ]}
      heading="Oddvision vs. copy-pasting into ChatGPT"
      lead="Both get you an AI answer. The difference is the trip: with a chat app you carry the page to the AI; with Oddvision the AI comes to the page."
      related={["/how-it-works", "/use-cases", "/faq"]}
    >
      <section className="privacy-section">
        <h2>Side by side</h2>
        <table className="ov-permissions-table">
          <thead>
            <tr>
              <th></th>
              <th>Oddvision</th>
              <th>Copying into ChatGPT</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.aspect}>
                <td>{r.aspect}</td>
                <td>{r.oddvision}</td>
                <td>{r.chat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="privacy-section">
        <h2>When Oddvision is the better fit</h2>
        <ul>
          <li>The question is about the page you&apos;re on: a paragraph, an error, a chart, an email.</li>
          <li>You ask many small questions while you work and don&apos;t want to keep switching tabs.</li>
          <li>The thing you&apos;re asking about is an image or a figure you can&apos;t copy as text.</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>When a chat app is the better fit</h2>
        <ul>
          <li>You want a long back-and-forth conversation or to refine an answer over many turns.</li>
          <li>You&apos;re working across uploaded files, or want your history saved for later.</li>
          <li>The task isn&apos;t about any particular webpage.</li>
        </ul>
        <p>Many people use both: a chat app for long work sessions, Oddvision for quick questions about the page in front of them.</p>
      </section>
    </ContentPage>
  );
}
