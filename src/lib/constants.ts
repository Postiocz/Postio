/**
 * Postio – central application constants.
 *
 * Anything that is used in more than one place (or that we want to be able
 * to tweak in a single file) should live here.
 *
 * Keep this file PURE (no React, no Next.js, no Supabase) so it can be
 * imported from both server and client code.
 */

// ---------------------------------------------------------------------------
// Media upload – allowed MIME types
// ---------------------------------------------------------------------------

/**
 * Image MIME types accepted by Postio.
 *
 * IMPORTANT: keep this list strict. Meta / Instagram / LinkedIn / X / TikTok
 * all reject anything outside JPEG/PNG/WEBP – especially animated formats
 * (GIF, animated WEBP) and vector graphics (SVG). Allowing them here would
 * lead to publishing errors (Meta subcode 2207082 and friends).
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * Video MIME types accepted by Postio.
 *
 * Only MP4 (H.264/AAC) and QuickTime (.mov) are reliably accepted by all
 * social platforms. Anything else (AVI, MKV, WMV, FLV, WEBM…) will fail at
 * upload time with cryptic platform errors.
 */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
] as const;

export const ALLOWED_IMAGE_TYPE_SET: ReadonlySet<string> = new Set(
  ALLOWED_IMAGE_TYPES,
);
export const ALLOWED_VIDEO_TYPE_SET: ReadonlySet<string> = new Set(
  ALLOWED_VIDEO_TYPES,
);

/** All MIME types accepted by the media uploader. */
export const ALLOWED_MEDIA_TYPES: readonly string[] = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

// ---------------------------------------------------------------------------
// Media upload – size limits
// ---------------------------------------------------------------------------

/**
 * Maximum size of a single video.
 *
 * Videos are not compressed by Postio (we only re-encode images), so anything
 * above this limit is hard-rejected before the upload even starts.
 */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Hard upper bound for any single media file (image or video).
 *
 * Images above the compression threshold are re-encoded before upload, so
 * the practical "soft" limit for images is much higher. This constant is the
 * absolute last-resort cap that applies to everything.
 */
export const ABSOLUTE_HARD_LIMIT = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Media upload – quality thresholds
// ---------------------------------------------------------------------------

/**
 * Minimum allowed video resolution (in pixels, on the shorter side).
 *
 * Meta recommends a minimum of 720p and rejects videos that are visibly
 * blurry. 640px is the lowest we accept before warning the user.
 */
export const MIN_VIDEO_DIMENSION = 640;
