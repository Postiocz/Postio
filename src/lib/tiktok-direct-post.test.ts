import { describe, expect, it } from "vitest";
import {
  computeTikTokPublishBlocked,
  isTikTokBrandedPrivateConflict,
  isTikTokPrivateOnlyAccount,
  resolveEffectiveTikTokPrivacyLevel,
  resolveTikTokDisableFlag,
  resolveTikTokEffectiveBrandFlags,
} from "./tiktok-direct-post";

const base = {
  hasTikTokIntent: true,
  privacyLevel: "PUBLIC_TO_EVERYONE",
  musicConsent: true,
  commercialEnabled: false,
  brandContent: false,
  brandOrganic: false,
  maxDurationSec: null,
  videoDurationSec: null,
};

describe("computeTikTokPublishBlocked", () => {
  it("allows publishing when every Direct Post requirement is met", () => {
    expect(computeTikTokPublishBlocked(base)).toEqual({
      blocked: false,
      reason: null,
    });
  });

  it("is never blocked when TikTok is not a target platform", () => {
    expect(
      computeTikTokPublishBlocked({ ...base, hasTikTokIntent: false, privacyLevel: null }),
    ).toEqual({ blocked: false, reason: null });
  });

  it("blocks when no privacy level is selected (no default)", () => {
    expect(
      computeTikTokPublishBlocked({ ...base, privacyLevel: null }),
    ).toEqual({ blocked: true, reason: "privacy" });
  });

  it("blocks when the video exceeds the creator's max duration", () => {
    expect(
      computeTikTokPublishBlocked({
        ...base,
        maxDurationSec: 60,
        videoDurationSec: 61,
      }),
    ).toEqual({ blocked: true, reason: "duration" });
  });

  it("allows a video exactly at the max duration", () => {
    expect(
      computeTikTokPublishBlocked({
        ...base,
        maxDurationSec: 60,
        videoDurationSec: 60,
      }),
    ).toEqual({ blocked: false, reason: null });
  });

  it("skips the duration check when creator_info returns no max duration", () => {
    // undefined is normalised to null by the caller (`?? null`); 0 means
    // "no limit" and must not block publishing.
    for (const maxDurationSec of [null, 0]) {
      expect(
        computeTikTokPublishBlocked({
          ...base,
          maxDurationSec,
          videoDurationSec: 9999,
        }),
      ).toEqual({ blocked: false, reason: null });
    }
  });

  it("blocks when the disclosure toggle is on but no option is chosen", () => {
    expect(
      computeTikTokPublishBlocked({
        ...base,
        commercialEnabled: true,
        brandContent: false,
        brandOrganic: false,
      }),
    ).toEqual({ blocked: true, reason: "disclosure" });
  });

  it("allows when the disclosure toggle is on and one option is chosen", () => {
    expect(
      computeTikTokPublishBlocked({
        ...base,
        commercialEnabled: true,
        brandContent: true,
      }),
    ).toEqual({ blocked: false, reason: null });
  });

  it("blocks when music usage consent is not given", () => {
    expect(
      computeTikTokPublishBlocked({ ...base, musicConsent: false }),
    ).toEqual({ blocked: true, reason: "consent" });
  });
});

describe("isTikTokBrandedPrivateConflict", () => {
  it("is true when branded content is combined with SELF_ONLY", () => {
    expect(isTikTokBrandedPrivateConflict(true, "SELF_ONLY")).toBe(true);
  });

  it("is false for branded content with public visibility", () => {
    expect(isTikTokBrandedPrivateConflict(true, "PUBLIC_TO_EVERYONE")).toBe(false);
  });

  it("is false when not branded content", () => {
    expect(isTikTokBrandedPrivateConflict(false, "SELF_ONLY")).toBe(false);
  });
});

describe("resolveTikTokDisableFlag", () => {
  it("disables the interaction when the user did not tick the Allow checkbox", () => {
    // undefined = no stored value / checkbox not ticked → interaction off.
    expect(resolveTikTokDisableFlag(undefined, false)).toBe(true);
    expect(resolveTikTokDisableFlag(true, false)).toBe(true);
  });

  it("enables the interaction when the user ticks the Allow checkbox", () => {
    expect(resolveTikTokDisableFlag(false, false)).toBe(false);
  });

  it("always disables when creator_info reports the interaction as disabled", () => {
    expect(resolveTikTokDisableFlag(undefined, true)).toBe(true);
    expect(resolveTikTokDisableFlag(false, true)).toBe(true);
    expect(resolveTikTokDisableFlag(true, true)).toBe(true);
  });
});

describe("isTikTokPrivateOnlyAccount", () => {
  it("is true when only SELF_ONLY is exposed (sandbox/private account)", () => {
    expect(isTikTokPrivateOnlyAccount(["SELF_ONLY"])).toBe(true);
    expect(isTikTokPrivateOnlyAccount(["SELF_ONLY", "SELF_ONLY"])).toBe(true);
  });

  it("is true when creator_info returns no options at all", () => {
    expect(isTikTokPrivateOnlyAccount(null)).toBe(true);
    expect(isTikTokPrivateOnlyAccount(undefined)).toBe(true);
    expect(isTikTokPrivateOnlyAccount([])).toBe(true);
  });

  it("is false when a non-private visibility option exists", () => {
    expect(isTikTokPrivateOnlyAccount(["SELF_ONLY", "PUBLIC_TO_EVERYONE"])).toBe(false);
    expect(isTikTokPrivateOnlyAccount(["PUBLIC_TO_EVERYONE"])).toBe(false);
    expect(isTikTokPrivateOnlyAccount(["FOLLOWER_OF_CREATOR"])).toBe(false);
  });
});

describe("resolveTikTokEffectiveBrandFlags", () => {
  it("sends both disclosure flags as false when the commercial toggle is off", () => {
    expect(resolveTikTokEffectiveBrandFlags(false, false, false)).toEqual({
      brand_content_toggle: false,
      brand_organic_toggle: false,
    });
    // Unknown/absent metadata must also never default to a disclosure label.
    expect(resolveTikTokEffectiveBrandFlags(false, undefined, undefined)).toEqual({
      brand_content_toggle: false,
      brand_organic_toggle: false,
    });
  });

  it("never sends a stale sub-option after toggle off → tick → toggle off", () => {
    // The user enabled the toggle, ticked Brand Organic, then disabled the
    // toggle again; the stale sub-option must not reach the API.
    expect(resolveTikTokEffectiveBrandFlags(false, undefined, true)).toEqual({
      brand_content_toggle: false,
      brand_organic_toggle: false,
    });
  });

  it("enables only brand_organic_toggle when the toggle is on + Brand Organic", () => {
    expect(resolveTikTokEffectiveBrandFlags(true, false, true)).toEqual({
      brand_content_toggle: false,
      brand_organic_toggle: true,
    });
  });

  it("enables only brand_content_toggle when the toggle is on + Branded Content", () => {
    expect(resolveTikTokEffectiveBrandFlags(true, true, false)).toEqual({
      brand_content_toggle: true,
      brand_organic_toggle: false,
    });
  });
});

describe("resolveEffectiveTikTokPrivacyLevel", () => {
  it("clears a previously chosen SELF_ONLY when Branded Content is enabled", () => {
    expect(resolveEffectiveTikTokPrivacyLevel(true, "SELF_ONLY")).toBeNull();
  });

  it("keeps non-private visibility for Branded Content", () => {
    expect(resolveEffectiveTikTokPrivacyLevel(true, "PUBLIC_TO_EVERYONE")).toBe(
      "PUBLIC_TO_EVERYONE",
    );
    expect(resolveEffectiveTikTokPrivacyLevel(true, "MUTUAL_FOLLOW_FRIENDS")).toBe(
      "MUTUAL_FOLLOW_FRIENDS",
    );
  });

  it("passes through the privacy level when not Branded Content", () => {
    expect(resolveEffectiveTikTokPrivacyLevel(false, "SELF_ONLY")).toBe("SELF_ONLY");
    expect(resolveEffectiveTikTokPrivacyLevel(false, null)).toBeNull();
  });
});
