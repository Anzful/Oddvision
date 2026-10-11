import type { Metadata } from "next";
import { page, ROLES, SHORTCUTS, SITE } from "./site";

const abs = (path: string) => new URL(path, SITE.url).toString();

/** Title, description, canonical URL and social cards for one page. */
export function pageMetadata(path: string, opts: { type?: "website" | "article" } = {}): Metadata {
  const p = page(path);
  return {
    // Titles that already name the brand skip the " | Oddvision" suffix.
    title: p.title.includes(SITE.name) ? { absolute: p.title } : p.title,
    description: p.description,
    alternates: { canonical: path },
    openGraph: {
      type: opts.type ?? "article",
      url: path,
      siteName: SITE.name,
      title: p.title,
      description: p.description,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.description },
  };
}

/* ───────────── schema.org (JSON-LD) ───────────── */

const ORG_ID = `${SITE.url}/#organization`;
const APP_ID = `${SITE.url}/#software`;

export const organizationLd = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE.name,
  url: SITE.url,
  logo: abs(SITE.logo),
  email: SITE.email,
  sameAs: [SITE.chromeStoreUrl],
});

export const websiteLd = () => ({
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  description: SITE.shortDescription,
  publisher: { "@id": ORG_ID },
  inLanguage: "en",
});

export const softwareLd = () => ({
  "@type": "SoftwareApplication",
  "@id": APP_ID,
  name: SITE.name,
  applicationCategory: "BrowserApplication",
  applicationSubCategory: "AI assistant",
  operatingSystem: "Google Chrome (Windows, macOS, Linux, ChromeOS)",
  description: SITE.description,
  url: SITE.url,
  installUrl: SITE.chromeStoreUrl,
  downloadUrl: SITE.chromeStoreUrl,
  image: abs(SITE.logo),
  publisher: { "@id": ORG_ID },
  featureList: [
    ...SHORTCUTS.map((s) => `${s.keys} — ${s.action}: ${s.detail}`),
    `AI roles: ${ROLES.map((r) => r.name).join(", ")}`,
    `Powered by ${SITE.aiModel}`,
  ],
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: `${SITE.freeDailyAnalyses} AI analyses per day`,
      url: SITE.chromeStoreUrl,
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: SITE.pro.price,
      priceCurrency: SITE.pro.currency,
      description: "Unlimited AI analyses, priority support, early access to new features",
      url: `${SITE.url}/#pricing`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: SITE.pro.price,
        priceCurrency: SITE.pro.currency,
        billingDuration: "P1M",
        valueAddedTaxIncluded: false,
      },
    },
  ],
});

export const breadcrumbLd = (path: string, crumbs: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  "@id": `${abs(path)}#breadcrumb`,
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })),
});

export const articleLd = (path: string) => {
  const p = page(path);
  return {
    "@type": "Article",
    "@id": `${abs(path)}#article`,
    headline: p.title,
    description: p.description,
    url: abs(path),
    dateModified: SITE.lastUpdated,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    about: { "@id": APP_ID },
    inLanguage: "en",
  };
};

export const faqLd = (qas: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: qas.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

/** Wraps nodes in a single @graph document. */
export const graph = (...nodes: object[]) => ({ "@context": "https://schema.org", "@graph": nodes });
