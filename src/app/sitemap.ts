import type { MetadataRoute } from "next";

// Dynamic sitemap generation via the Next.js Metadata API.
// Covers the public, indexable surface: the locale landing pages and the
// four public legal documents. The dashboard/auth routes are excluded on
// purpose – they are behind auth or irrelevant to search engines.

const SITE_URL = "https://postio-app.cz";
const LOCALES = ["cs", "en", "uk"] as const;

// Public, crawlable paths (relative, without the leading `/[locale]`).
const PUBLIC_PATHS = [
  "", // landing page
  "privacy-policy",
  "terms-of-service",
  "dpa",
  "ai-transparency-notice",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of PUBLIC_PATHS) {
      const url = `${SITE_URL}/${locale}${path ? `/${path}` : ""}`;
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.6,
      });
    }
  }

  return entries;
}
