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

  const durationExceeded =
    input.maxDurationSec != null &&
    input.maxDurationSec > 0 &&
    input.videoDurationSec != null &&
    input.videoDurationSec > input.maxDurationSec;
  if (durationExceeded) return { blocked: true, reason: "duration" };

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
