/**
 * Shared helper for routing external social-CDN images through our
 * `/api/proxy/image` route.
 *
 * Social platforms hand out signed, time-limited CDN URLs (fbcdn, licdn,
 * tiktokcdn, …). Once a signature expires the CDN answers 403 and the browser
 * logs a console error. The proxy fetches server-side and returns a neutral
 * placeholder (HTTP 200) for expired URLs, so the client never sees a 403.
 *
 * Non-CDN URLs (relative paths, data URIs, our own Supabase storage) are
 * returned unchanged. The allow-list below mirrors the one in the route.
 */

const ALLOWED_HOST_PATTERNS = [
  /(^|\.)fbcdn\.net$/i, // Facebook + Instagram CDN
  /(^|\.)cdninstagram\.com$/i, // Instagram CDN
  /(^|\.)licdn\.com$/i, // LinkedIn CDN
  /(^|\.)twimg\.com$/i, // X / Twitter CDN
  /(^|\.)tiktokcdn/i, // TikTok CDN (tiktokcdn.com, -eu.com, -us.com, …)
  /(^|\.)ggpht\.com$/i, // YouTube avatar CDN
  /(^|\.)googleusercontent\.com$/i, // Google/YouTube CDN
  /(^|\.)ytimg\.com$/i, // YouTube thumbnails
];

export function shouldProxyImage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  return ALLOWED_HOST_PATTERNS.some((re) => re.test(parsed.hostname));
}

/**
 * Returns a proxied URL for external CDN images, or the original URL when no
 * proxying is needed (relative paths, data URIs, own storage, …).
 */
export function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (!shouldProxyImage(url)) return url;
  return `/api/proxy/image?url=${encodeURIComponent(url)}`;
}
