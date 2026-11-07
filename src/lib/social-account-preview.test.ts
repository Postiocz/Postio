import { describe, expect, it } from "vitest";
import {
  PREVIEWABLE_PLATFORMS,
  mapSocialAccountForPreview,
  normalizeTikTokHandle,
  readCachedTikTokUsername,
  resolveTikTokUsername,
} from "./social-account-preview";

// Fake secrets — anything that reaches the mapped output is a leak.
const TIKTOK_REFRESH_TOKEN = "fake-refresh-token-value";
const FACEBOOK_PAGE_TOKEN = "fake-facebook-page-token";

const tiktokRow = {
  platform: "tiktok",
  account_name: "Postio Account",
  avatar_url: "https://cdn.example/avatar.jpg",
  metadata: {
    refresh_token: TIKTOK_REFRESH_TOKEN,
    open_id: "open-id-value",
    creator_info_cache: {
      creator_username: "@Creator.One",
      creator_nickname: "Creator",
    },
  },
};

describe("mapSocialAccountForPreview", () => {
  it("returns only the safe fields — metadata (and tokens) never survive", () => {
    const safe = mapSocialAccountForPreview(tiktokRow);

    expect(safe).toEqual({
      platform: "tiktok",
      account_name: "Postio Account",
      avatar_url: "https://cdn.example/avatar.jpg",
      tiktokUsername: "Creator.One",
    });

    expect(Object.keys(safe).sort()).toEqual([
      "account_name",
      "avatar_url",
      "platform",
      "tiktokUsername",
    ]);
    expect(JSON.stringify(safe)).not.toContain(TIKTOK_REFRESH_TOKEN);
    expect(JSON.stringify(safe)).not.toContain("open-id-value");
    expect(JSON.stringify(safe)).not.toContain("creator_info_cache");
  });

  it("drops the Facebook Page access_token from the payload", () => {
    const safe = mapSocialAccountForPreview({
      platform: "facebook",
      account_name: "Postio Page",
      avatar_url: null,
      metadata: { access_token: FACEBOOK_PAGE_TOKEN, category: "Marketing" },
    });

    expect(safe).toEqual({
      platform: "facebook",
      account_name: "Postio Page",
      avatar_url: null,
      tiktokUsername: null,
    });
    expect(JSON.stringify(safe)).not.toContain(FACEBOOK_PAGE_TOKEN);
  });

  it("falls back to safe defaults for empty rows", () => {
    expect(mapSocialAccountForPreview({})).toEqual({
      platform: "",
      account_name: "",
      avatar_url: null,
      tiktokUsername: null,
    });
  });
});

describe("resolveTikTokUsername", () => {
  it("prefers the cached creator handle (trimmed, without the @)", () => {
    expect(resolveTikTokUsername(tiktokRow)).toBe("Creator.One");
  });

  it("falls back to the account name, compacted and lowercased", () => {
    expect(
      resolveTikTokUsername({
        platform: "tiktok",
        account_name: " @Postio App ",
        metadata: {},
      }),
    ).toBe("postioapp");
  });

  it("is null for non-TikTok platforms", () => {
    expect(
      resolveTikTokUsername({
        platform: "instagram",
        account_name: "Postio",
        metadata: { creator_info_cache: { creator_username: "@nope" } },
      }),
    ).toBeNull();
    expect(resolveTikTokUsername(null)).toBeNull();
    expect(resolveTikTokUsername(undefined)).toBeNull();
  });
});

describe("normalizeTikTokHandle", () => {
  it("trims, strips the leading @ and removes whitespace", () => {
    expect(normalizeTikTokHandle("  @Creator One  ")).toBe("creatorone");
  });

  it("returns null for empty or non-string input", () => {
    expect(normalizeTikTokHandle("")).toBeNull();
    expect(normalizeTikTokHandle("   ")).toBeNull();
    expect(normalizeTikTokHandle("@")).toBeNull();
    expect(normalizeTikTokHandle(null)).toBeNull();
    expect(normalizeTikTokHandle(undefined)).toBeNull();
    expect(normalizeTikTokHandle(42)).toBeNull();
  });
});

describe("readCachedTikTokUsername", () => {
  it("reads creator_info_cache.creator_username", () => {
    expect(readCachedTikTokUsername(tiktokRow.metadata)).toBe("@Creator.One");
  });

  it("is null for malformed metadata", () => {
    expect(readCachedTikTokUsername(null)).toBeNull();
    expect(readCachedTikTokUsername("string")).toBeNull();
    expect(readCachedTikTokUsername({})).toBeNull();
    expect(readCachedTikTokUsername({ creator_info_cache: null })).toBeNull();
    expect(
      readCachedTikTokUsername({ creator_info_cache: { creator_username: 7 } }),
    ).toBeNull();
  });
});

describe("PREVIEWABLE_PLATFORMS", () => {
  it("stays in sync with the platforms the preview dialog renders", () => {
    expect([...PREVIEWABLE_PLATFORMS]).toEqual([
      "facebook",
      "instagram",
      "youtube",
      "linkedin",
      "tiktok",
      "twitter",
    ]);
  });
});