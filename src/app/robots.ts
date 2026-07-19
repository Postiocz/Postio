import type { MetadataRoute } from "next";

// Robots configuration via the Next.js Metadata API.
// Allows all crawlers and points them at the generated sitemap. Auth and
// dashboard areas are application-internal and not referenced here because
// they are not present in the sitemap in the first place.

const SITE_URL = "https://postio-app.cz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
