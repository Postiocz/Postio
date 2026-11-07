// Pure, framework-free logic for the *scheduled* (cron) TikTok publishing path.
//
// It mirrors the Direct Post UX rules of the immediate path in
// `src/lib/actions/publish-tiktok.ts` (plus `src/lib/tiktok-direct-post.ts`),
// which the Deno edge function cannot import. Keeping the rules here — free of
// Deno/Supabase APIs — makes them unit-testable with `deno test`.
//
// Metadata keys are the ones written by both editors into
// `post_platforms.metadata` (see `platformMetadata` in posts/new and
// edit-post-dialog): privacy_level, disable_comment, disable_duet,
// disable_stitch, commercial_enabled, brand_content_toggle,
// brand_organic_toggle, video_duration_sec.

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "SELF_ONLY"
  | "FOLLOWER_OF_CREATOR";

export const TIKTOK_SUPPORTED_PRIVACY_LEVELS: readonly TikTokPrivacyLevel[] = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
  "FOLLOWER_OF_CREATOR",
];

/** Same wording as the immediate path in `publish-tiktok.ts`. */
export const TIKTOK_VIDEO_REQUIRED_ERROR =
  "TikTok vyžaduje video soubor (MP4 nebo MOV).";
export const TIKTOK_PRIVACY_REQUIRED_ERROR =
  "TikTok vyžaduje výběr viditelnosti videa před publikací.";
/**
 * A stored visibility that the creator no longer offers must not be replaced
 * silently — the user has to pick again (Direct Post UX).
 */
export const TIKTOK_PRIVACY_UNAVAILABLE_ERROR =
  "Zvolená viditelnost videa už není pro tento TikTok účet dostupná. Vyberte ji prosím znovu v Postiu.";
/**
 * Branded content (paid partnership) can only be public/friends, never private.
 * Mirrors `isTikTokBrandedPrivateConflict` on the immediate path.
 */
export const TIKTOK_BRANDED_PRIVATE_ERROR =
  "Obsah označený jako „Branded content“ (propagace jiné značky) nelze publikovat s viditelností „Pouze já“. Zvolte prosím veřejnou viditelnost.";
/** Czech text shown to the user instead of the raw `code: message` from TikTok. */
export const TIKTOK_PRIVATE_ONLY_ERROR =
  "TikTok u neauditované aplikace povolí publikování jen na soukromé účty. Nestačí nastavit příspěvek na 'Pouze já' - samotný TikTok účet musí být při publikování nastaven jako soukromý.";

export function buildTikTokMaxDurationError(maxVideoPostDurationSec: number): string {
  return `Video přesahuje maximální délku ${maxVideoPostDurationSec} s povolenou pro tento TikTok účet.`;
}

export type TikTokPlatformSettings = {
  privacyLevel?: TikTokPrivacyLevel;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  commercialEnabled?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
  videoDurationSec?: number | null;
};

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Reads the TikTok settings the user stored on the post. Unknown/invalid
 * values stay `undefined` (or `null` for the duration) so the rules below can
 * treat them as "not chosen" instead of guessing.
 */
export function readTikTokPlatformSettings(
  metadata: Record<string, unknown> | null | undefined,
): TikTokPlatformSettings {
  if (!metadata || typeof metadata !== "object") return {};

  const rawPrivacyLevel = metadata.privacy_level;
  const privacyLevel = TIKTOK_SUPPORTED_PRIVACY_LEVELS.includes(
    rawPrivacyLevel as TikTokPrivacyLevel,
  )
    ? (rawPrivacyLevel as TikTokPrivacyLevel)
    : undefined;

  return {
    privacyLevel,
    disableComment: readOptionalBoolean(metadata.disable_comment),
    disableDuet: readOptionalBoolean(metadata.disable_duet),
    disableStitch: readOptionalBoolean(metadata.disable_stitch),
    commercialEnabled: readOptionalBoolean(metadata.commercial_enabled),
    brandContentToggle: readOptionalBoolean(metadata.brand_content_toggle),
    brandOrganicToggle: readOptionalBoolean(metadata.brand_organic_toggle),
    videoDurationSec: readOptionalNumber(metadata.video_duration_sec),
  };
}

/** TikTok requires a video file for a Direct Post (no images in this flow). */
export function isTikTokVideoUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  const cleanUrl = url.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mkv")
  );
}

/**
 * Duration check against `creator_info.max_video_post_duration_sec`.
 * Missing/zero limit means "no limit", unknown duration means "cannot be
 * checked here" — neither ever counts as exceeded.
 */
export function isTikTokDurationExceeded(
  videoDurationSec: number | null | undefined,
  maxDurationSec: number | null | undefined,
): boolean {
  if (maxDurationSec == null || maxDurationSec <= 0) return false;
  if (videoDurationSec == null) return false;
  return videoDurationSec > maxDurationSec;
}

/** True only when creator_info exposes SELF_ONLY as the sole visibility. */
export function isTikTokPrivateOnlyOptions(
  privacyLevelOptions: readonly string[],
): boolean {
  return (
    privacyLevelOptions.length === 1 && privacyLevelOptions[0] === "SELF_ONLY"
  );
}

/**
 * Visibility for a scheduled post.
 *
 * - missing stored visibility  -> hard error (no silent default)
 * - private-only account / dev -> SELF_ONLY (kept from the previous
 *   implementation: it is what makes sandbox uploads work at all)
 * - stored value still offered -> that value
 * - stored value no longer offered -> hard error instead of silently posting
 *   with PUBLIC/FRIENDS (the previous fallback order)
 */
export function resolveScheduledTikTokPrivacyLevel(params: {
  requestedPrivacyLevel?: TikTokPrivacyLevel;
  privacyLevelOptions: readonly string[];
  isDevelopmentMode: boolean;
}): { ok: true; privacyLevel: TikTokPrivacyLevel } | { ok: false; error: string } {
  const { requestedPrivacyLevel, privacyLevelOptions, isDevelopmentMode } = params;

  if (!requestedPrivacyLevel) {
    return { ok: false, error: TIKTOK_PRIVACY_REQUIRED_ERROR };
  }

  if (isDevelopmentMode || isTikTokPrivateOnlyOptions(privacyLevelOptions)) {
    return { ok: true, privacyLevel: "SELF_ONLY" };
  }

  if (privacyLevelOptions.includes(requestedPrivacyLevel)) {
    return { ok: true, privacyLevel: requestedPrivacyLevel };
  }

  return { ok: false, error: TIKTOK_PRIVACY_UNAVAILABLE_ERROR };
}

/**
 * Both disclosure flags are strictly false unless the disclosure toggle is ON
 * and the respective option is ticked (protects against stale sub-options).
 * Mirrors `resolveTikTokEffectiveBrandFlags` on the immediate path.
 */
export function resolveTikTokEffectiveBrandFlags(
  commercialEnabled: boolean,
  brandContentToggle: boolean | undefined,
  brandOrganicToggle: boolean | undefined,
): { brandContentToggle: boolean; brandOrganicToggle: boolean } {
  return {
    brandContentToggle: commercialEnabled && brandContentToggle === true,
    brandOrganicToggle: commercialEnabled && brandOrganicToggle === true,
  };
}

/**
 * A user-selected "disable" wins; a creator_info restriction is always
 * enforced. Absent stored value means the interaction stays disabled, exactly
 * like `resolveTikTokDisableFlag` in `src/lib/tiktok-direct-post.ts`.
 */
export function resolveTikTokDisableFlag(
  userDisable: boolean | undefined,
  creatorDisabled: boolean,
): boolean {
  return (userDisable ?? true) || creatorDisabled;
}

/**
 * The private-only retry (TikTok rejects unaudited clients posting to
 * non-private accounts) may only downgrade visibility to SELF_ONLY when the
 * video carries no branded-content disclosure — branded content can never be
 * private. Returns false when the retry must be skipped.
 */
export function canRetryTikTokAsPrivateOnly(params: {
  privacyLevel: TikTokPrivacyLevel;
  brandContentToggle: boolean;
}): boolean {
  if (params.privacyLevel === "SELF_ONLY") return false;
  return !params.brandContentToggle;
}

export type TikTokCreatorLimits = {
  privacyLevelOptions: readonly string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
};

export type ScheduledTikTokPlan = {
  privacyLevel: TikTokPrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContentToggle: boolean;
  brandOrganicToggle: boolean;
};

export type ScheduledTikTokPlanResult =
  | { ok: true; plan: ScheduledTikTokPlan }
  | { ok: false; error: string };

/**
 * Runs every Direct Post pre-flight for a scheduled post, in the same order as
 * `publishToTikTokAction` (video format → duration → visibility → disclosure),
 * and returns either the first user-facing error or the final payload flags.
 * Nothing is sent to TikTok by this function.
 */
export function buildScheduledTikTokPlan(params: {
  videoUrl: string | null | undefined;
  metadata: Record<string, unknown> | null | undefined;
  creator: TikTokCreatorLimits;
  isDevelopmentMode: boolean;
}): ScheduledTikTokPlanResult {
  const { videoUrl, metadata, creator, isDevelopmentMode } = params;

  if (!isTikTokVideoUrl(videoUrl)) {
    return { ok: false, error: TIKTOK_VIDEO_REQUIRED_ERROR };
  }

  const settings = readTikTokPlatformSettings(metadata);

  if (
    isTikTokDurationExceeded(
      settings.videoDurationSec,
      creator.maxVideoPostDurationSec,
    )
  ) {
    return {
      ok: false,
      error: buildTikTokMaxDurationError(creator.maxVideoPostDurationSec as number),
    };
  }

  const privacy = resolveScheduledTikTokPrivacyLevel({
    requestedPrivacyLevel: settings.privacyLevel,
    privacyLevelOptions: creator.privacyLevelOptions,
    isDevelopmentMode,
  });
  if (!privacy.ok) return { ok: false, error: privacy.error };

  const brandFlags = resolveTikTokEffectiveBrandFlags(
    settings.commercialEnabled === true,
    settings.brandContentToggle,
    settings.brandOrganicToggle,
  );

  // Branded content can only be public/friends – never "Only me".
  if (brandFlags.brandContentToggle && privacy.privacyLevel === "SELF_ONLY") {
    return { ok: false, error: TIKTOK_BRANDED_PRIVATE_ERROR };
  }

  return {
    ok: true,
    plan: {
      privacyLevel: privacy.privacyLevel,
      disableComment: resolveTikTokDisableFlag(
        settings.disableComment,
        creator.commentDisabled,
      ),
      disableDuet: resolveTikTokDisableFlag(
        settings.disableDuet,
        creator.duetDisabled,
      ),
      disableStitch: resolveTikTokDisableFlag(
        settings.disableStitch,
        creator.stitchDisabled,
      ),
      brandContentToggle: brandFlags.brandContentToggle,
      brandOrganicToggle: brandFlags.brandOrganicToggle,
    },
  };
}