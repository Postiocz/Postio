import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Image proxy for social network avatars.
//
// Social platforms hand out *signed, time-limited* CDN URLs (e.g. Facebook's
// `fbcdn.net`). Once the signature expires the CDN answers 403, and the
// browser logs a console error even though we have a graceful fallback.
//
// This route fetches the image server-side and returns a neutral placeholder
// (HTTP 200) whenever the upstream request fails, so the client never sees a
// 403. To stay safe it only proxies a strict allow-list of CDN hosts.
// ---------------------------------------------------------------------------

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

// Neutral gray placeholder (SVG circle) returned when the upstream image is
// unavailable/expired. Keeps the <img> request successful (HTTP 200) so the
// browser never logs a 403, and shows a subtle circle instead of a blank spot.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="32" fill="#27272a"/>
  <circle cx="32" cy="24" r="10" fill="#71717a"/>
  <path d="M12 54c3-8 12-11 20-11s17 3 20 11" fill="#71717a"/>
</svg>`;

function placeholderResponse(): NextResponse {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function isAllowedHost(host: string): boolean {
  return ALLOWED_HOST_PATTERNS.some((re) => re.test(host));
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url param" }, { status: 400 });
  }

  // Only proxy http(s) from allow-listed hosts.
  if (!["http:", "https:"].includes(target.protocol) || !isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      // Keep the same UA so CDNs treat it as a normal image request.
      headers: { "User-Agent": "Mozilla/5.0 (Postio avatar proxy)" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      // Expired / forbidden upstream URL → serve placeholder instead.
      return placeholderResponse();
    }

    const contentType = upstream.headers.get("content-type") ?? "image/*";
    const body = await upstream.arrayBuffer();

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // Network error → placeholder, client still gets a 200.
    return placeholderResponse();
  }
}
