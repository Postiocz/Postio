// Tests for the pure scheduled-TikTok rules.
//
// Run with (Deno is not vendored in this repo, so fetch it via npx):
//   npx -y deno test --unstable-sloppy-imports \
//     supabase/functions/process-scheduled-posts/tiktok-logic_test.ts
//
// The flag is needed because the repo's tsconfig forbids ".ts" extensions in
// imports, so both index.ts and this file import the logic module extensionless
// (tsc resolves it, Deno needs the flag / a bundler like the Supabase CLI).

// The repo has no Deno type package – `types.d.ts` types only the `Deno`
// surface used by index.ts. Declare the test-runner surface module-locally so
// `tsc --noEmit` stays green; the real global is used at runtime.
declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
};

import {
  TIKTOK_BRANDED_PRIVATE_ERROR,
  TIKTOK_PRIVACY_REQUIRED_ERROR,
  TIKTOK_PRIVACY_UNAVAILABLE_ERROR,
  TIKTOK_VIDEO_REQUIRED_ERROR,
  buildScheduledTikTokPlan,
  buildTikTokMaxDurationError,
  canRetryTikTokAsPrivateOnly,
  isTikTokDurationExceeded,
  isTikTokPrivateOnlyOptions,
  isTikTokVideoUrl,
  readTikTokPlatformSettings,
  resolveScheduledTikTokPrivacyLevel,
  resolveTikTokDisableFlag,
  resolveTikTokEffectiveBrandFlags,
} from "./tiktok-logic";
import type { TikTokCreatorLimits, TikTokPlatformSettings } from "./tiktok-logic";

function assertEquals<T>(actual: T, expected: T, message?: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(
      `${message ?? "assertEquals"} – expected ${e}, got ${a}`,
    );
  }
}

function assertTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const creator: TikTokCreatorLimits = {
  privacyLevelOptions: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
  commentDisabled: false,
  duetDisabled: true,
  stitchDisabled: false,
  maxVideoPostDurationSec: 60,
};

const METADATA_FULL = {
  privacy_level: "PUBLIC_TO_EVERYONE",
  disable_comment: false,
  disable_duet: false,
  disable_stitch: false,
  commercial_enabled: true,
  brand_content_toggle: false,
  brand_organic_toggle: true,
  video_duration_sec: 30,
};

// ---------------------------------------------------------------------------
// readTikTokPlatformSettings
// ---------------------------------------------------------------------------

Deno.test("readTikTokPlatformSettings reads every key written by the editors", () => {
  const settings: TikTokPlatformSettings = readTikTokPlatformSettings(METADATA_FULL);
  assertEquals(settings, {
    privacyLevel: "PUBLIC_TO_EVERYONE",
    disableComment: false,
    disableDuet: false,
    disableStitch: false,
    commercialEnabled: true,
    brandContentToggle: false,
    brandOrganicToggle: true,
    videoDurationSec: 30,
  });
});

Deno.test("readTikTokPlatformSettings treats missing or invalid values as not chosen", () => {
  assertEquals(readTikTokPlatformSettings(null), {});
  assertEquals(readTikTokPlatformSettings(undefined), {});

  // Unknown visibility enum, wrong scalar types, non-finite duration.
  assertEquals(
    readTikTokPlatformSettings({
      privacy_level: "EVERYONE",
      disable_comment: "false",
      commercial_enabled: 1,
      video_duration_sec: Number.NaN,
    }),
    {
      privacyLevel: undefined,
      disableComment: undefined,
      disableDuet: undefined,
      disableStitch: undefined,
      commercialEnabled: undefined,
      brandContentToggle: undefined,
      brandOrganicToggle: undefined,
      videoDurationSec: null,
    },
  );
});

// ---------------------------------------------------------------------------
// isTikTokVideoUrl
// ---------------------------------------------------------------------------

Deno.test("isTikTokVideoUrl accepts the extensions used by the immediate path", () => {
  for (const url of [
    "https://cdn.example/video.mp4",
    "https://cdn.example/video.mov",
    "https://cdn.example/video.m4v",
    "https://cdn.example/video.webm",
    "https://cdn.example/video.mkv",
    "https://cdn.example/video.mp4?token=abc#t=1",
  ]) {
    assertTrue(isTikTokVideoUrl(url), `expected video url: ${url}`);
  }
});

Deno.test("isTikTokVideoUrl rejects images, empty values and non-strings", () => {
  for (const url of [
    "https://cdn.example/photo.jpg",
    "https://cdn.example/photo.png",
    "https://cdn.example/file",
    "  ",
    "",
    null,
    undefined,
  ]) {
    assertEquals(isTikTokVideoUrl(url), false, `expected non-video: ${String(url)}`);
  }
});

// ---------------------------------------------------------------------------
// isTikTokDurationExceeded
// ---------------------------------------------------------------------------

Deno.test("isTikTokDurationExceeded compares against the creator's limit", () => {
  assertEquals(isTikTokDurationExceeded(61, 60), true);
  assertEquals(isTikTokDurationExceeded(60, 60), false);
  assertEquals(isTikTokDurationExceeded(10, 60), false);
});

Deno.test("isTikTokDurationExceeded skips the check when either side is unknown", () => {
  assertEquals(isTikTokDurationExceeded(null, 60), false);
  assertEquals(isTikTokDurationExceeded(undefined, 60), false);
  assertEquals(isTikTokDurationExceeded(9999, null), false);
  assertEquals(isTikTokDurationExceeded(9999, 0), false);
});

// ---------------------------------------------------------------------------
// resolveScheduledTikTokPrivacyLevel
// ---------------------------------------------------------------------------

Deno.test("privacy: a missing stored visibility is a hard error", () => {
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: undefined,
      privacyLevelOptions: creator.privacyLevelOptions,
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_PRIVACY_REQUIRED_ERROR },
  );
});

Deno.test("privacy: a stored visibility still offered by the creator is used", () => {
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: "MUTUAL_FOLLOW_FRIENDS",
      privacyLevelOptions: creator.privacyLevelOptions,
      isDevelopmentMode: false,
    }),
    { ok: true, privacyLevel: "MUTUAL_FOLLOW_FRIENDS" },
  );
});

Deno.test("privacy: a stored visibility no longer offered is an error (no silent fallback)", () => {
  // Previously this silently fell back to PUBLIC_TO_EVERYONE/FRIENDS.
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: "PUBLIC_TO_EVERYONE",
      privacyLevelOptions: ["MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_PRIVACY_UNAVAILABLE_ERROR },
  );
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: "PUBLIC_TO_EVERYONE",
      privacyLevelOptions: [],
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_PRIVACY_UNAVAILABLE_ERROR },
  );
});

Deno.test("privacy: private-only accounts keep publishing as SELF_ONLY (sandbox path)", () => {
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: "PUBLIC_TO_EVERYONE",
      privacyLevelOptions: ["SELF_ONLY"],
      isDevelopmentMode: false,
    }),
    { ok: true, privacyLevel: "SELF_ONLY" },
  );
  assertTrue(isTikTokPrivateOnlyOptions(["SELF_ONLY"]), "SELF_ONLY only is private-only");
  assertEquals(isTikTokPrivateOnlyOptions(["SELF_ONLY", "PUBLIC_TO_EVERYONE"]), false);
});

Deno.test("privacy: development mode always posts as SELF_ONLY", () => {
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: "PUBLIC_TO_EVERYONE",
      privacyLevelOptions: creator.privacyLevelOptions,
      isDevelopmentMode: true,
    }),
    { ok: true, privacyLevel: "SELF_ONLY" },
  );
});

Deno.test("privacy: the missing-visibility gate runs before the dev-mode coercion", () => {
  // Same order as publishToTikTokAction: no stored choice = error, even in dev.
  assertEquals(
    resolveScheduledTikTokPrivacyLevel({
      requestedPrivacyLevel: undefined,
      privacyLevelOptions: creator.privacyLevelOptions,
      isDevelopmentMode: true,
    }),
    { ok: false, error: TIKTOK_PRIVACY_REQUIRED_ERROR },
  );
});

// ---------------------------------------------------------------------------
// Brand disclosure
// ---------------------------------------------------------------------------

Deno.test("brand flags are false when the commercial toggle is off", () => {
  assertEquals(resolveTikTokEffectiveBrandFlags(false, true, true), {
    brandContentToggle: false,
    brandOrganicToggle: false,
  });
  assertEquals(resolveTikTokEffectiveBrandFlags(false, undefined, undefined), {
    brandContentToggle: false,
    brandOrganicToggle: false,
  });
});

Deno.test("brand flags follow the ticked option when the toggle is on", () => {
  assertEquals(resolveTikTokEffectiveBrandFlags(true, false, true), {
    brandContentToggle: false,
    brandOrganicToggle: true,
  });
  assertEquals(resolveTikTokEffectiveBrandFlags(true, true, false), {
    brandContentToggle: true,
    brandOrganicToggle: false,
  });
});

// ---------------------------------------------------------------------------
// Interaction flags
// ---------------------------------------------------------------------------

Deno.test("interactions: absent choice stays disabled", () => {
  assertEquals(resolveTikTokDisableFlag(undefined, false), true);
});

Deno.test("interactions: the user's choice applies unless the creator forbids it", () => {
  assertEquals(resolveTikTokDisableFlag(false, false), false);
  assertEquals(resolveTikTokDisableFlag(false, true), true);
  assertEquals(resolveTikTokDisableFlag(true, false), true);
});

// ---------------------------------------------------------------------------
// Private-only retry
// ---------------------------------------------------------------------------

Deno.test("private-only retry is allowed for a non-private, non-branded video", () => {
  assertEquals(
    canRetryTikTokAsPrivateOnly({
      privacyLevel: "PUBLIC_TO_EVERYONE",
      brandContentToggle: false,
    }),
    true,
  );
});

Deno.test("private-only retry never runs for already private visibility", () => {
  assertEquals(
    canRetryTikTokAsPrivateOnly({
      privacyLevel: "SELF_ONLY",
      brandContentToggle: false,
    }),
    false,
  );
});

Deno.test("private-only retry never turns branded content private", () => {
  // Branded content is only valid as public/friends, so the retry must be
  // skipped instead of publishing a paid partnership as "Only me".
  assertEquals(
    canRetryTikTokAsPrivateOnly({
      privacyLevel: "PUBLIC_TO_EVERYONE",
      brandContentToggle: true,
    }),
    false,
  );
});

// ---------------------------------------------------------------------------
// buildScheduledTikTokPlan
// ---------------------------------------------------------------------------

Deno.test("plan: happy path returns visibility, disclosure and interaction flags", () => {
  const result = buildScheduledTikTokPlan({
    videoUrl: "https://cdn.example/video.mp4",
    metadata: METADATA_FULL,
    creator,
    isDevelopmentMode: false,
  });
  assertEquals(result, {
    ok: true,
    plan: {
      privacyLevel: "PUBLIC_TO_EVERYONE",
      disableComment: false, // user allowed, creator allows
      disableDuet: true, // user allowed, but creator forbids duet
      disableStitch: false, // user allowed, creator allows
      brandContentToggle: false,
      brandOrganicToggle: true,
    },
  });
});

Deno.test("plan: a non-video URL is refused before anything else", () => {
  assertEquals(
    buildScheduledTikTokPlan({
      videoUrl: "https://cdn.example/photo.jpg",
      metadata: null,
      creator,
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_VIDEO_REQUIRED_ERROR },
  );
});

Deno.test("plan: an over-long video is refused with the creator's limit", () => {
  assertEquals(
    buildScheduledTikTokPlan({
      videoUrl: "https://cdn.example/video.mp4",
      metadata: { ...METADATA_FULL, video_duration_sec: 61 },
      creator,
      isDevelopmentMode: false,
    }),
    { ok: false, error: buildTikTokMaxDurationError(60) },
  );
});

Deno.test("plan: missing visibility in metadata is a hard error", () => {
  assertEquals(
    buildScheduledTikTokPlan({
      videoUrl: "https://cdn.example/video.mp4",
      metadata: { video_duration_sec: 10 },
      creator,
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_PRIVACY_REQUIRED_ERROR },
  );
});

Deno.test("plan: branded content cannot be published as private", () => {
  // Explicit SELF_ONLY choice by the user.
  assertEquals(
    buildScheduledTikTokPlan({
      videoUrl: "https://cdn.example/video.mp4",
      metadata: {
        ...METADATA_FULL,
        privacy_level: "SELF_ONLY",
        brand_content_toggle: true,
        brand_organic_toggle: false,
      },
      creator,
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_BRANDED_PRIVATE_ERROR },
  );

  // Private-only account: visibility is coerced to SELF_ONLY, so branded
  // content must be refused as well.
  assertEquals(
    buildScheduledTikTokPlan({
      videoUrl: "https://cdn.example/video.mp4",
      metadata: {
        ...METADATA_FULL,
        brand_content_toggle: true,
        brand_organic_toggle: false,
      },
      creator: { ...creator, privacyLevelOptions: ["SELF_ONLY"] },
      isDevelopmentMode: false,
    }),
    { ok: false, error: TIKTOK_BRANDED_PRIVATE_ERROR },
  );
});

Deno.test("plan: branded content is fine with public visibility", () => {
  const result = buildScheduledTikTokPlan({
    videoUrl: "https://cdn.example/video.mp4",
    metadata: {
      ...METADATA_FULL,
      brand_content_toggle: true,
      brand_organic_toggle: false,
    },
    creator,
    isDevelopmentMode: false,
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.plan.brandContentToggle, true);
    assertEquals(result.plan.brandOrganicToggle, false);
  }
});

Deno.test("plan: interaction restrictions from creator_info are always applied", () => {
  const result = buildScheduledTikTokPlan({
    videoUrl: "https://cdn.example/video.mp4",
    metadata: { ...METADATA_FULL, disable_comment: false, disable_stitch: false },
    creator: { ...creator, commentDisabled: true, stitchDisabled: true },
    isDevelopmentMode: false,
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.plan.disableComment, true);
    assertEquals(result.plan.disableStitch, true);
  }
});

Deno.test("plan: a video with unknown duration is allowed", () => {
  const result = buildScheduledTikTokPlan({
    videoUrl: "https://cdn.example/video.mp4",
    metadata: {
      privacy_level: "MUTUAL_FOLLOW_FRIENDS",
      video_duration_sec: null,
    },
    creator,
    isDevelopmentMode: false,
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    // Absent choices mean "disabled" (same rule as the immediate path).
    assertEquals(result.plan.disableComment, true);
    assertEquals(result.plan.disableDuet, true);
    assertEquals(result.plan.disableStitch, true);
  }
});