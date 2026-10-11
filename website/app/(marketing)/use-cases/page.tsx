import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import ContentPage from "../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";
import { page } from "@/lib/site";

const PATH = "/use-cases";
export const metadata: Metadata = pageMetadata(PATH);

const CASES = [
  { path: "/use-cases/studying", name: "Studying", blurb: "Explain concepts, summarize readings and work through practice problems step by step." },
  { path: "/use-cases/coding", name: "Coding", blurb: "Understand error messages, unfamiliar code and long documentation." },
  { path: "/use-cases/reading-and-research", name: "Reading and research", blurb: "Get the key points of long articles, reports and terms of service." },
  { path: "/use-cases/writing", name: "Writing", blurb: "Draft email replies and rewrite text in the tone you need." },
  { path: "/use-cases/charts-and-images", name: "Charts and images", blurb: "Snip a chart, diagram or image and ask what it shows." },
];

export default function UseCases() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[{ name: "Use cases", path: PATH }]}
      heading="What you can do with Oddvision"
      lead="Oddvision works on any page you can open in Chrome. These are the jobs people use it for most."
      related={["/how-it-works", "/compare/oddvision-vs-chatgpt", "/faq"]}
    >
      <section className="privacy-section">
        <div className="content-cards">
          {CASES.map((c) => (
            <Link key={c.path} href={c.path} className="content-card">
              <strong>{c.name}</strong>
              <span>{c.blurb}</span>
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 28 }}>
          Deciding between Oddvision and a chat app? See{" "}
          <Link href="/compare/oddvision-vs-chatgpt">{page("/compare/oddvision-vs-chatgpt").title}</Link>.
        </p>
      </section>
    </ContentPage>
  );
}
