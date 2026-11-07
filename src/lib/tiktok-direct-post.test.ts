import { describe, expect, it } from "vitest";
import {
  buildTikTokCreatorInfoKey,
  computeTikTokPublishBlocked,
  isTikTokBrandedPrivateConflict,
  isTikTokDurationExceeded,
  isTikTokPrivateOnlyAccount,
  readTikTokVideoDurationSec,
  resolveEffectiveTikTokPrivacyLevel,
  resolveTikTokCreatorInfoView,
  resolveTikTokDisableFlag,
  resolveTikTokEffectiveBrandFlags,
  validateTikTokVideoDuration,
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

describe("resolveTikTokCreatorInfoView", () => {
  it("reports loading only while the request is actually in flight", () => {
    expect(
      resolveTikTokCreatorInfoView({ loading: true, info: null, error: null }),
    ).toEqual({ status: "loading" });
  });

  it("reports ready once creator_info arrived", () => {
    expect(
      resolveTikTokCreatorInfoView({
        loading: false,
        info: { creatorNickname: "Postio" },
        error: null,
      }),
    ).toEqual({ status: "ready" });
  });

  it("reports an error – not loading – when the request failed", () => {
    // The failure path previously left the panel on "Loading TikTok account
    // options…" forever; a settled request without data must read as an error.
    expect(
      resolveTikTokCreatorInfoView({
        loading: false,
        info: null,
        error: "Nepodařilo se načíst možnosti TikTok účtu.",
      }),
    ).toEqual({ status: "error" });
  });

  it("reports an error when the request settled without data and no message", () => {
    // Belt and braces: a silent failure (network throw, missing account) still
    // must not render as loading, so publishing stays blocked with a message.
    expect(
      resolveTikTokCreatorInfoView({ loading: false, info: null, error: null }),
    ).toEqual({ status: "error" });
  });

  it("prefers a fresh error over stale creator info", () => {
    // After switching to an account whose creator_info failed, the previous
    // account's data must not keep the panel looking healthy.
    expect(
      resolveTikTokCreatorInfoView({
        loading: false,
        info: { creatorNickname: "Previous account" },
        error: "creator_info_failed",
      }),
    ).toEqual({ status: "error" });
  });
});

describe("buildTikTokCreatorInfoKey", () => {
  it("produces a new key when the target TikTok account changes", () => {
    // The editor's useEffect depends on this key, so a different account id
    // means a refetch of that creator's privacy options and nickname.
    expect(buildTikTokCreatorInfoKey(true, "account-a")).not.toBe(
      buildTikTokCreatorInfoKey(true, "account-b"),
    );
  });

  it("keeps the key stable for the same account", () => {
    expect(buildTikTokCreatorInfoKey(true, "account-a")).toBe(
      buildTikTokCreatorInfoKey(true, "account-a"),
    );
  });

  it("is null when TikTok is not a target platform", () => {
    expect(buildTikTokCreatorInfoKey(false, "account-a")).toBeNull();
    expect(buildTikTokCreatorInfoKey(false, null)).toBeNull();
  });

  it("still loads (default account) when the selection is not resolved yet", () => {
    expect(buildTikTokCreatorInfoKey(true, null)).toBe("tiktok:default");
    expect(buildTikTokCreatorInfoKey(true, undefined)).toBe("tiktok:default");
  });
});

describe("isTikTokDurationExceeded", () => {
  it("is true only when the video is longer than the creator's limit", () => {
    expect(isTikTokDurationExceeded(61, 60)).toBe(true);
    expect(isTikTokDurationExceeded(60, 60)).toBe(false);
    expect(isTikTokDurationExceeded(10, 60)).toBe(false);
  });

  it("is false when either side is unknown", () => {
    expect(isTikTokDurationExceeded(null, 60)).toBe(false);
    expect(isTikTokDurationExceeded(undefined, 60)).toBe(false);
    expect(isTikTokDurationExceeded(9999, null)).toBe(false);
    expect(isTikTokDurationExceeded(9999, 0)).toBe(false);
  });
});

describe("readTikTokVideoDurationSec", () => {
  it("reads the duration stored by the editor", () => {
    expect(readTikTokVideoDurationSec({ video_duration_sec: 42.5 })).toBe(42.5);
  });

  it("treats missing, non-numeric and non-finite values as unknown", () => {
    expect(readTikTokVideoDurationSec(null)).toBeNull();
    expect(readTikTokVideoDurationSec(undefined)).toBeNull();
    expect(readTikTokVideoDurationSec({})).toBeNull();
    expect(readTikTokVideoDurationSec({ video_duration_sec: "61" })).toBeNull();
    expect(readTikTokVideoDurationSec({ video_duration_sec: Number.NaN })).toBeNull();
    expect(readTikTokVideoDurationSec({ video_duration_sec: Infinity })).toBeNull();
  });
});

describe("validateTikTokVideoDuration (server pre-flight)", () => {
  it("returns an error for a video longer than the creator's limit", () => {
    // This is what publishToTikTokAction returns before video/init – no video
    // bytes are sent to TikTok for an over-long video.
    const videoDurationSec = readTikTokVideoDurationSec({
      video_duration_sec: 61,
    });
    expect(
      validateTikTokVideoDuration({ videoDurationSec, maxDurationSec: 60 }),
    ).toEqual({
      ok: false,
      error: "Video přesahuje maximální délku 60 s povolenou pro tento TikTok účet.",
    });
  });

  it("passes a video at or under the limit", () => {
    expect(
      validateTikTokVideoDuration({ videoDurationSec: 60, maxDurationSec: 60 }),
    ).toEqual({ ok: true });
    expect(
      validateTikTokVideoDuration({ videoDurationSec: 8, maxDurationSec: 60 }),
    ).toEqual({ ok: true });
  });

  it("passes when the duration or the creator's limit is unknown", () => {
    expect(
      validateTikTokVideoDuration({ videoDurationSec: null, maxDurationSec: 60 }),
    ).toEqual({ ok: true });
    expect(
      validateTikTokVideoDuration({ videoDurationSec: 9999, maxDurationSec: null }),
    ).toEqual({ ok: true });
    expect(
      validateTikTokVideoDuration({ videoDurationSec: 9999, maxDurationSec: 0 }),
    ).toEqual({ ok: true });
  });
});
