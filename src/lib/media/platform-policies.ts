/**
 * Postio – per-platform media policies + shared validator.
 *
 * Single source of truth for what media each social platform accepts,
 * drawn from each platform's official API/upload documentation (verified
 * 2026-09-13 – see ukol.md "ÚKOL: Jednotná per-platform validace médií").
 *
 * This module is PURE (no React, no Next.js, no Supabase) so it can be
 * imported from both client code (post editors) and server code (publish.ts).
 * Keep it that way.
 *
 * Global hard limits that apply to ALL platforms (allowed MIME allow-list,
 * absolute size caps) live in `src/lib/constants.ts`. These policies ADD the
 * per-platform constraints ON TOP of the global caps.
 */

import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What media a platform accepts for a single post. */
export type MediaSupport =
  | "none" // text-only (no media)
  | "image_only"
  | "video_only"
  | "image_and_video";

/** Minimal view of one media item that the pure validator needs. */
export type MediaCandidate = {
  /** Optional stable id from the caller (e.g. the hook's item.id). */
  id?: string;
  kind: "image" | "video";
  /** MIME type, e.g. "image/jpeg". `undefined` → type check skipped. */
  mimeType?: string;
  /** Original file size in bytes. `undefined` → size check skipped. */
  fileSizeBytes?: number;
  /** Pixel dimensions. `undefined` → ratio/resolution checks skipped. */
  dimensions?: { width: number; height: number };
  /** Video length in seconds. `undefined` → duration check skipped. */
  durationSec?: number;
};

export type ValidationSeverity = "error" | "warning";

/**
 * One detected violation.
 *
 * `code` is a stable machine-readable key (future i18n string key).
 * `message` is a human-readable English fallback shown until i18n lands
 * (KROK 5). KROK 2 may map `code` → translated string.
 */
export type ValidationIssue = {
  platformId: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** When the issue is tied to one specific media file. */
  candidateId?: string;
};

/** Per-platform media policy. All limits are optional. */
export type MediaPolicy = {
  platformId: string;
  support: MediaSupport;
  /** Allowed image MIME types (subset of ALLOWED_IMAGE_TYPES). */
  allowedImageTypes?: readonly string[];
  /** Allowed video MIME types (subset of ALLOWED_VIDEO_TYPES). */
  allowedVideoTypes?: readonly string[];
  /** Maximum single image size in bytes. */
  maxImageBytes?: number;
  /** Maximum single video size in bytes. */
  maxVideoBytes?: number;
  /** Minimum accepted width/height ratio (e.g. 4/5 = 0.8). */
  minRatio?: number;
  /** Maximum accepted width/height ratio (e.g. 1.91). */
  maxRatio?: number;
  /** Minimum allowed shorter-side dimension in pixels. */
  minDimension?: number;
  /** Maximum video length in seconds. */
  maxDurationSec?: number;
  /** Maximum number of media files for one post. */
  maxFiles?: number;
  /** Free-form note (English) shown to the user in tooltips. */
  note?: string;
};

export const MB = 1024 * 1024;

// ---------------------------------------------------------------------------
// Platform policies
// ---------------------------------------------------------------------------

// FB – Graph API "Page Photos": jpeg/bmp/png/gif/tiff, ≤10 MB/photo (PNG
// recommended < 1 MB); video MP4/MOV up to 240 min. The global 50 MB video
// cap in constants.ts is tighter than FB's 10 GB, so video size is not
// repeated here.
export const FACEBOOK_POLICY: MediaPolicy = {
  platformId: "facebook",
  support: "image_and_video",
  allowedImageTypes: ALLOWED_IMAGE_TYPES,
  allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  maxImageBytes: 10 * MB,
  maxDurationSec: 240 * 60,
  note: "Facebook podporuje obrázky (JPG/PNG) a vidéa MP4/MOV.",
};

// IG – graph-api meta content publishing: images jpeg/png ≤ 8 MB organic,
// feed ratio 4:5–1.91:1 (stories 9:16), video MP4/MOV ≤ 4 GB, 3 s–60 min.
// The global 50 MB video cap is tighter than IG's 4 GB, so video size is
// not repeated here. Stories ratio (9:16) is intentionally OUT of scope for
// the feed policy – feed is what the editor publishes.
export const INSTAGRAM_POLICY: MediaPolicy = {
  platformId: "instagram",
  support: "image_and_video",
  allowedImageTypes: ["image/jpeg", "image/png"],
  allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  maxImageBytes: 8 * MB,
  minRatio: 4 / 5, // 0.8
  maxRatio: 1.91,
  minDimension: 640,
  maxDurationSec: 60 * 60,
  note: "Instagram feed: poměr 4:5–1.91:1, JPG/PNG, video MP4/MOV.",
};

// LI – LinkedIn Assets API: images jpeg/gif/png < 36 MP px (feedshare-image),
// video MP4/MOV/AVI/WebM/MKV ≤ 10 min / < 200 MB (feedshare-video). Postio
// v1 intentionally does NOT publish video to LinkedIn (publish-linkedin
// returns an error), hence `image_only` even though the API supports video.
export const LINKEDIN_POLICY: MediaPolicy = {
  platformId: "linkedin",
  support: "image_only",
  allowedImageTypes: ["image/jpeg", "image/png"],
  maxImageBytes: 5 * MB,
  maxFiles: 9,
  note: "LinkedIn: obrázky JPG/PNG (video v Postio v1 nepodporované).",
};

// YT – YouTube upload: MP4/MOV/AVI/WMV/WebM… ≤ 12 h / 256 GB, 16:9 default,
// Shorts 9:16/1:1 ≤ 3 min. The global 50 MB video cap dominates the 256 GB
// limit. YouTube posts are video-only in this app.
export const YOUTUBE_POLICY: MediaPolicy = {
  platformId: "youtube",
  support: "video_only",
  allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  maxDurationSec: 12 * 60 * 60,
  maxFiles: 1,
  note: "YouTube: video MP4/MOV, do 12 h, 16:9.",
};

// X – X API media upload: images jpg/png/gif ≤ 5 MB (gif 15 MB), ≤ 4 per
// post; video MP4/MOV (H.264/AAC) ≤ 512 MB, 0.5–140 s, ratios 16:9 / 1:1
// (portrait 9:16 also appears). The global 50 MB video cap is tighter.
export const X_POLICY: MediaPolicy = {
  platformId: "twitter",
  support: "image_and_video",
  allowedImageTypes: ["image/jpeg", "image/png"],
  allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  maxImageBytes: 5 * MB,
  maxVideoBytes: 512 * MB,
  minRatio: 9 / 16, // 0.5625
  maxRatio: 16 / 9, // 1.777…
  maxDurationSec: 140,
  maxFiles: 4,
  note: "X: obrázky ≤5 MB, video ≤512 MB a max 2:20 min, 16:9/1:1.",
};

// TT – TikTok Content Posting API: video MP4/MOV, up to 3 min (longer from
// external source), ≤ ~72 MB in-app (Android) / 278.6 MB (iOS), min
// resolution 540×960, ratios 9:16 / 1:1 / 16:9. This app publishes TikTok
// posts as video-only.
export const TIKTOK_POLICY: MediaPolicy = {
  platformId: "tiktok",
  support: "video_only",
  allowedVideoTypes: ALLOWED_VIDEO_TYPES,
  maxVideoBytes: 72 * MB, // conservative in-app Android limit
  minRatio: 9 / 16,
  maxRatio: 16 / 9,
  minDimension: 540,
  maxDurationSec: 3 * 60,
  maxFiles: 1,
  note: "TikTok: video MP4/MOV, do 3 min, poměr 9:16/1:1/16:9.",
};

/** All supported policies, keyed by platform id used across the app. */
export const MEDIA_POLICIES: ReadonlyArray<MediaPolicy> = [
  FACEBOOK_POLICY,
  INSTAGRAM_POLICY,
  LINKEDIN_POLICY,
  YOUTUBE_POLICY,
  X_POLICY,
  TIKTOK_POLICY,
];

const POLICY_BY_PLATFORM: ReadonlyMap<string, MediaPolicy> = new Map(
  MEDIA_POLICIES.map((p) => [p.platformId, p]),
);

/** Look up a policy. Returns the default policy for unknown platforms. */
export function getPlatformPolicy(platformId: string): MediaPolicy {
  return POLICY_BY_PLATFORM.get(platformId) ?? {
    platformId,
    support: "image_and_video",
  };
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

const severityOf = (policy: MediaPolicy, kind: "ratio" | "resolution"): ValidationSeverity => {
  // Aspect ratio is a soft constraint (CLAUDE/AGENTS "varování předem"),
  // everything else hard-fails.
  return kind === "ratio" ? "warning" : "error";
};

/**
 * Validate a single media candidate against one policy.
 *
 * Assumes the caller already enforced the GLOBAL caps from constants.ts
 * (MIME allow-list, 50 MB absolute limits) at upload time. This validator
 * adds the per-platform constraints: allowed subtype, size, ratio,
 * resolution, duration and support (image vs video).
 */
export function validateCandidate(
  media: MediaCandidate,
  policy: MediaPolicy,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pt = policy.platformId;
  const failing = (severity: ValidationSeverity, code: string, message: string) =>
    issues.push({ platformId: pt, severity, code, message, candidateId: media.id });

  // --- Support (does the platform accept this media kind at all?) ---
  if (policy.support === "none" || policy.support === "image_only") {
    if (
      (policy.support === "image_only" && media.kind === "video") ||
      policy.support === "none"
    ) {
      failing(
        "error",
        "media_kind_unsupported",
        `Platform "${pt}" does not accept ${media.kind}s.`,
      );
    }
  }
  if (policy.support === "video_only" && media.kind === "image") {
    failing(
      "error",
      "media_kind_unsupported",
      `Platform "${pt}" requires a video – images are not accepted.`,
    );
  }

  // --- MIME type within the platform's allowed subset ---
  const allowed = media.kind === "image" ? policy.allowedImageTypes : policy.allowedVideoTypes;
  if (allowed && media.mimeType && !allowed.includes(media.mimeType)) {
    failing(
      "error",
      "media_format_unsupported",
      `Format ${media.mimeType || "unknown"} is not accepted on "${pt}".`,
    );
  }

  // --- Per-kind size limit ---
  const maxBytes =
    media.kind === "image" ? policy.maxImageBytes : policy.maxVideoBytes;
  if (maxBytes !== undefined && media.fileSizeBytes !== undefined && media.fileSizeBytes > maxBytes) {
    failing(
      "error",
      media.kind === "image" ? "image_too_large" : "video_too_large",
      `${media.kind === "image" ? "Image" : "Video"} exceeds the ${maxBytes / MB} MB limit on "${pt}".`,
    );
  }

  // --- Aspect ratio (soft warning) ---
  const { dimensions } = media;
  if (
    dimensions &&
    dimensions.width > 0 &&
    dimensions.height > 0 &&
    (policy.minRatio !== undefined || policy.maxRatio !== undefined)
  ) {
    const ratio = dimensions.width / dimensions.height;
    if (
      (policy.maxRatio !== undefined && ratio > policy.maxRatio) ||
      (policy.minRatio !== undefined && ratio < policy.minRatio)
    ) {
      const from =
        policy.minRatio !== undefined ? `${policy.minRatio.toFixed(2)}:1` : "";
      const to = policy.maxRatio !== undefined ? `–${policy.maxRatio.toFixed(2)}:1` : "";
      failing(
        severityOf(policy, "ratio"),
        "media_aspect_ratio",
        `Aspect ratio ${ratio.toFixed(2)}:1 is outside the allowed ${from}${to} range on "${pt}".`,
      );
    }
  }

  // --- Resolution (min shorter side) ---
  if (
    policy.minDimension !== undefined &&
    dimensions &&
    dimensions.width > 0 &&
    dimensions.height > 0
  ) {
    const minSide = Math.min(dimensions.width, dimensions.height);
    if (minSide < policy.minDimension) {
      failing(
        severityOf(policy, "resolution"),
        "media_low_resolution",
        `Shorter side ${minSide}px is below the ${policy.minDimension}px minimum on "${pt}".`,
      );
    }
  }

  // --- Duration (videos) ---
  if (
    media.kind === "video" &&
    policy.maxDurationSec !== undefined &&
    media.durationSec !== undefined &&
    media.durationSec > policy.maxDurationSec
  ) {
    failing(
      "error",
      "video_too_long",
      `Video is ${media.durationSec}s, over the ${policy.maxDurationSec}s limit on "${pt}".`,
    );
  }

  return issues;
}

/** Convenience: run the shared validator over a whole media list. */
export function validateMediaForPolicies(
  media: readonly MediaCandidate[],
  policies: readonly MediaPolicy[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const candidate of media) {
    for (const policy of policies) {
      issues.push(...validateCandidate(candidate, policy));
    }
  }
  return issues;
}

/**
 * List-level validation: the per-post media COUNT against a policy's
 * `maxFiles` cap. Per-candidate rules live in `validateCandidate`; the count
 * is a property of the whole media list, so it is checked separately.
 * Returns an error-severity issue when the cap is exceeded.
 */
export function validateMediaCount(
  media: readonly MediaCandidate[],
  policy: MediaPolicy,
): ValidationIssue[] {
  if (policy.maxFiles === undefined || media.length <= policy.maxFiles) {
    return [];
  }
  return [
    {
      platformId: policy.platformId,
      severity: "error",
      code: "media_count_too_many",
      message: `Platform "${policy.platformId}" accepts at most ${policy.maxFiles} media files.`,
    },
  ];
}

/**
 * True when the media list satisfies the platform's HARD constraints (no
 * error-severity issues). Soft warnings (e.g. aspect ratio) do not block.
 * Used to decide whether Publish/Schedule may go ahead (KROK 2).
 */
export function isMediaCompatibleWithPlatform(
  media: readonly MediaCandidate[],
  platformId: string,
): boolean {
  const policy = getPlatformPolicy(platformId);
  return media.every((candidate) =>
    validateCandidate(candidate, policy).every((i) => i.severity !== "error"),
  );
}