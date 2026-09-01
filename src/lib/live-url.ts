// Single source of truth for building the "Open on network" URL of a
// published post. Used by all preview surfaces (Posts + Calendar).

export type LiveUrlOptions = {
  /** TikTok handle without leading "@" (e.g. "postio"). When missing the TikTok URL cannot be built. */
  tiktokUsername?: string | null;
};

export type LiveUrlResult = {
  url: string;
  /**
   * True when the link intentionally points at the profile instead of the
   * post itself. Happens for TikTok sandbox videos where TikTok never
   * exposes a public post ID – App Review testers still need a one-click
   * way to the uploaded video (profile → private section).
   */
  profileFallback: boolean;
};

/**
 * TikTok-specific URL builder.
 * - Real video URL when a genuine video ID is stored.
 * - Profile URL fallback when the ID is missing – or when it is a legacy
 *   temporary `v_pub_...` publish_id left over from the old fallback bug
 *   (such an ID can never form a working video URL).
 */
export function buildTikTokLiveUrl(
  externalId: string | null | undefined,
  username: string | null | undefined,
): LiveUrlResult | null {
  const handle = username?.trim().replace(/^@/, "");
  if (!handle) return null; // never fabricate a handle/URL

  const id = externalId?.trim();
  if (id && !id.startsWith("v_pub_")) {
    return { url: `https://www.tiktok.com/@${handle}/video/${id}`, profileFallback: false };
  }
  // Sandbox / no public post ID → link the profile so the video can still
  // be reached (it lives in the account's private section).
  return { url: `https://www.tiktok.com/@${handle}`, profileFallback: true };
}

/** Rich variant of `buildLiveUrl` that also reports the profile-fallback case. */
export function buildLiveUrlInfo(
  platform: string,
  externalId: string | null | undefined,
  options: LiveUrlOptions = {},
): LiveUrlResult | null {
  switch (platform) {
    case "tiktok":
      return buildTikTokLiveUrl(externalId, options.tiktokUsername);
    default:
      break;
  }

  if (!externalId || typeof externalId !== "string") return null;
  const id = externalId.trim();
  if (!id) return null;

  switch (platform) {
    case "facebook":
      return { url: `https://www.facebook.com/${id}`, profileFallback: false };
    case "instagram": {
      // external_id formats:
      //   - "shortcode|media_id" (new posts) — extract shortcode for URL
      //   - "shortcode" (if only shortcode was stored)
      //   - "1234567890" (old posts — numeric media ID only)
      const pipeIdx = id.indexOf("|");
      if (pipeIdx > 0) {
        const shortcode = id.slice(0, pipeIdx);
        return { url: `https://www.instagram.com/p/${shortcode}/`, profileFallback: false };
      }
      if (/^\d+$/.test(id)) {
        // Numeric media ID — no shortcode available
        return { url: `https://www.instagram.com/`, profileFallback: false };
      }
      return { url: `https://www.instagram.com/p/${id}/`, profileFallback: false };
    }
    case "linkedin":
      if (id.startsWith("urn:li:share:")) {
        return { url: `https://www.linkedin.com/feed/update/${id}/`, profileFallback: false };
      }
      return {
        url: `https://www.linkedin.com/feed/update/urn:li:share:${id}/`,
        profileFallback: false,
      };
    case "youtube":
      return { url: `https://www.youtube.com/watch?v=${id}`, profileFallback: false };
    case "twitter":
    case "x":
      return { url: `https://x.com/i/status/${id}`, profileFallback: false };
    default:
      return null;
  }
}

export function buildLiveUrl(
  platform: string,
  externalId: string | null | undefined,
  options: LiveUrlOptions = {},
): string | null {
  return buildLiveUrlInfo(platform, externalId, options)?.url ?? null;
}
