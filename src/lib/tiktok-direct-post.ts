// Pure, framework-free logic for the TikTok Direct Post UX requirements
// (Content Sharing Guidelines). Kept separate from the React components so
// the disabled-state rules are unit-testable and identical in the new-post
// editor and the edit dialog.

export type TikTokPublishBlockReason =
  | "privacy"
  | "duration"
  | "disclosure"
  | "consent"
  | null;

export type TikTokPublishBlockInput = {
  hasTikTokIntent: boolean;
  privacyLevel: string | null;
  musicConsent: boolean;
  commercialEnabled: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  maxDurationSec: number | null;
  videoDurationSec: number | null;
};

/**
 * Duration check against `creator_info.max_video_post_duration_sec`.
 * A missing/zero max duration means "no limit" and an unknown video duration
 * means "cannot be checked here" – neither ever counts as exceeded.
 *
 * Shared by the editor (blocked action buttons + inline warning) and the
 * server pre-flight in `publish-tiktok.ts`, so both use one rule.
 */
export function isTikTokDurationExceeded(
  videoDurationSec: number | null | undefined,
  maxDurationSec: number | null | undefined,
): boolean {
  if (maxDurationSec == null || maxDurationSec <= 0) return false;
  if (videoDurationSec == null) return false;
  return videoDurationSec > maxDurationSec;
}

/**
 * Server-side pre-flight result for the video duration. On failure no bytes
 * are ever sent to TikTok (checked before `publish/video/init`).
 */
export function validateTikTokVideoDuration(params: {
  videoDurationSec: number | null | undefined;
  maxDurationSec: number | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  const { videoDurationSec, maxDurationSec } = params;
  if (!isTikTokDurationExceeded(videoDurationSec, maxDurationSec)) {
    return { ok: true };
  }
  return { ok: false, error: buildTikTokDurationError(maxDurationSec as number) };
}

/** Czech server-side message (all other TikTok action errors are Czech too). */
export function buildTikTokDurationError(maxDurationSec: number): string {
  return `Video přesahuje maximální délku ${maxDurationSec} s povolenou pro tento TikTok účet.`;
}

/**
 * Reads the client-measured video duration out of a post's platform metadata.
 * Anything that is not a finite number counts as "unknown" (null) – an unknown
 * duration never blocks a publish on its own.
 */
export function readTikTokVideoDurationSec(
  metadata: Record<string, unknown> | null | undefined,
): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.video_duration_sec;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/** Settled state of the creator_info request backing the TikTok panel. */
export type TikTokCreatorInfoView =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready" };

/**
 * Direct Post UX: the panel must never stay on "loading" once the request has
 * settled. A settled request without data (creator_info failed, account
 * missing, network error) is a failure and is shown as such – the publish
 * actions stay blocked. Note the final `"error"` fallback: it is what turns a
 * silent failure into a message instead of an eternal "loading" text.
 */
export function resolveTikTokCreatorInfoView(input: {
  loading: boolean;
  info: unknown | null;
  error: string | null;
}): TikTokCreatorInfoView {
  if (input.loading) return { status: "loading" };
  if (input.error) return { status: "error" };
  return input.info ? { status: "ready" } : { status: "error" };
}

/**
 * Effect key for the creator_info request – a changed key means "refetch".
 * It carries the selected TikTok account id so switching the target account
 * reloads that creator's nickname, privacy options and interaction flags.
 * Returns `null` when TikTok is not a target platform (nothing to load).
 */
export function buildTikTokCreatorInfoKey(
  hasTikTokIntent: boolean,
  accountId: string | null | undefined,
): string | null {
  if (!hasTikTokIntent) return null;
  return `tiktok:${accountId ?? "default"}`;
}

/**
 * Direct Post UX: publishing is blocked until the user has (1) explicitly
 * picked a privacy level (no default), (2) consented to TikTok's terms,
 * (3) chosen at least one commercial option when the disclosure toggle is on,
 * and (4) the video does not exceed the creator's max duration.
 */
export function computeTikTokPublishBlocked(
  input: TikTokPublishBlockInput,
): { blocked: boolean; reason: TikTokPublishBlockReason } {
  if (!input.hasTikTokIntent) return { blocked: false, reason: null };
  if (!input.privacyLevel) return { blocked: true, reason: "privacy" };

  if (isTikTokDurationExceeded(input.videoDurationSec, input.maxDurationSec)) {
    return { blocked: true, reason: "duration" };
  }

  const commercialMissing =
    input.commercialEnabled && !input.brandContent && !input.brandOrganic;
  if (commercialMissing) return { blocked: true, reason: "disclosure" };

  if (!input.musicConsent) return { blocked: true, reason: "consent" };

  return { blocked: false, reason: null };
}

/**
 * Branded content can only be public/friends – "Only me" must be disabled.
 */
export function isTikTokBrandedPrivateConflict(
  brandContent: boolean,
  privacyLevel: string | null,
): boolean {
  return brandContent && privacyLevel === "SELF_ONLY";
}

/**
 * Effective privacy level used by the UI: when the user later enables
 * Branded Content while "Only me" was previously chosen, the selection is
 * cleared (returned as null) so the user must re-pick a valid visibility
 * instead of silently keeping a conflicting value.
 */
export function resolveEffectiveTikTokPrivacyLevel(
  brandContent: boolean,
  privacyLevel: string | null,
): string | null {
  if (brandContent && privacyLevel === "SELF_ONLY") return null;
  return privacyLevel;
}

/**
 * True when creator_info exposes NO non-private visibility option. Branded
 * Content requires public/friends visibility, so on such an account the
 * "Branded Content" option must be disabled.
 */
export function isTikTokPrivateOnlyAccount(
  privacyLevelOptions: readonly string[] | null | undefined,
): boolean {
  if (!privacyLevelOptions || privacyLevelOptions.length === 0) return true;
  return privacyLevelOptions.every((level) => level === "SELF_ONLY");
}

/**
 * A user-selected "disable" toggle wins; a creator_info "disabled" flag is
 * always enforced (an interaction the creator turned off can never be
 * re-enabled by a posting app).
 *
 * Semantics: `userDisable = true` means the user did NOT tick the "Allow"
 * checkbox (the interaction stays disabled). `userDisable = false` means the
 * user explicitly allowed the interaction.
 */
export function resolveTikTokDisableFlag(
  userDisable: boolean | undefined,
  creatorDisabled: boolean,
): boolean {
  return (userDisable ?? true) || creatorDisabled;
}

/**
 * Builds the effective commercial-disclosure flags for the Direct Post API,
 * server-side. Both are strictly `false` whenever the disclosure toggle is
 * OFF (or the value is unknown) – a video must never carry a "Promotional
 * content" / "Paid partnership" label unless the user explicitly enabled the
 * toggle AND the respective option. This protects against stale sub-options
 * (e.g. "enable toggle → tick Brand Organic → disable toggle again").
 */
export function resolveTikTokEffectiveBrandFlags(
  commercialEnabled: boolean,
  brandContentToggle: boolean | undefined,
  brandOrganicToggle: boolean | undefined,
): { brand_content_toggle: boolean; brand_organic_toggle: boolean } {
  return {
    brand_content_toggle: commercialEnabled && brandContentToggle === true,
    brand_organic_toggle: commercialEnabled && brandOrganicToggle === true,
  };
}
