import React from "react";
import type { Metadata } from "next";
import ContentPage, { Kbd } from "../../../components/ContentPage";
import { pageMetadata } from "@/lib/seo";

const PATH = "/use-cases/charts-and-images";
export const metadata: Metadata = pageMetadata(PATH);

export default function ChartsAndImages() {
  return (
    <ContentPage
      path={PATH}
      crumbs={[
        { name: "Use cases", path: "/use-cases" },
        { name: "Charts and images", path: PATH },
      ]}
      heading="Screenshot to AI: ask about charts, diagrams and images"
      lead="Not everything on a page is text you can copy. With Alt+4 you drag a box around anything visible in Chrome and ask the AI about it."
      related={["/use-cases/studying", "/use-cases/coding", "/how-it-works"]}
    >
      <section className="privacy-section">
        <h2>How the snip works</h2>
        <p>
          Press <Kbd>Alt+4</Kbd>, drag over the area you want, and release. Oddvision sends just that region to the AI and
          shows the answer in the overlay. Press <Kbd>Alt+3</Kbd> to hide the overlay and again to bring it back.
        </p>
      </section>

      <section className="privacy-section">
        <h2>What it&apos;s good at</h2>
        <ul>
          <li>Charts and dashboards: trends, outliers and what changed between periods.</li>
          <li>Diagrams: biology figures, circuits, flowcharts and system architectures.</li>
          <li>Text inside images: slides, scanned pages, infographics and screenshots of code.</li>
          <li>Scanned pages and documents shown as images, where the text can&apos;t be selected.</li>
          <li>A paused frame of a lecture or tutorial video.</li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>Getting accurate answers</h2>
        <ul>
          <li>Include the axis labels and legend when you snip a chart; the AI needs them to read values.</li>
          <li>Zoom the page in first if the text in the image is small.</li>
          <li>Double-check exact numbers read from images before you rely on them.</li>
        </ul>
      </section>
    </ContentPage>
  );
}
