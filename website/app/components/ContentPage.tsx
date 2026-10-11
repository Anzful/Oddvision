import React from "react";
import Link from "next/link";
import JsonLd from "./JsonLd";
import { page, SITE } from "@/lib/site";
import { articleLd, breadcrumbLd, graph } from "@/lib/seo";

type Crumb = { name: string; path: string };

/**
 * Layout for guide / use-case / comparison pages: breadcrumbs, H1, lead,
 * body, an install call-to-action, related links, and Article +
 * BreadcrumbList structured data (plus any extra JSON-LD nodes).
 */
export default function ContentPage({
  path,
  crumbs,
  heading,
  lead,
  related = [],
  extraLd = [],
  children,
}: {
  path: string;
  crumbs: Crumb[]; // excluding Home, ending with this page
  heading: string;
  lead: React.ReactNode;
  related?: string[];
  extraLd?: object[];
  children: React.ReactNode;
}) {
  const trail = [{ name: "Home", path: "/" }, ...crumbs];
  return (
    <div className="privacy-page content-page">
      <JsonLd data={graph(breadcrumbLd(path, trail), articleLd(path), ...extraLd)} />

      <nav aria-label="Breadcrumb" className="content-breadcrumb">
        {trail.map((c, i) => (
          <React.Fragment key={c.path}>
            {i > 0 && <span aria-hidden="true"> / </span>}
            {i < trail.length - 1 ? <Link href={c.path}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
          </React.Fragment>
        ))}
      </nav>

      <article className="privacy-container">
        <h1>{heading}</h1>
        <p className="content-lead">{lead}</p>

        {children}

        <aside className="content-cta">
          <div>
            <strong>Try Oddvision free</strong>
            <span>
              {SITE.freeDailyAnalyses} AI answers a day on the free plan. Pro is {SITE.pro.label}.
            </span>
          </div>
          <a href={SITE.chromeStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Add to Chrome
          </a>
        </aside>

        {related.length > 0 && (
          <nav aria-label="Related pages" className="content-related">
            <h2>Related</h2>
            <ul>
              {related.map((r) => (
                <li key={r}>
                  <Link href={r}>{page(r).title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </div>
  );
}

/** Keyboard key styling for inline shortcuts. */
export const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className="content-kbd">{children}</kbd>;
