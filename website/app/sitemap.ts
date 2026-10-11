import type { MetadataRoute } from "next";
import { PAGES, SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(SITE.lastUpdated);
  return PAGES.map((p) => ({
    url: new URL(p.path, SITE.url).toString(),
    lastModified,
    changeFrequency: p.path === "/" ? "weekly" : "monthly",
    priority: p.path === "/" ? 1 : ["/privacy", "/terms", "/refund"].includes(p.path) ? 0.3 : 0.7,
  }));
}
