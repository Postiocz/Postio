import { describe, expect, it } from "vitest";
import {
  DELETE_CAPABILITIES,
  buildDeleteTargets,
  canDeleteViaApi,
  platformDisplayName,
  type DeleteTargetRow,
} from "./delete-capabilities";

/** Helper: one published platform row. */
const pub = (
  platform: string,
  args: Partial<DeleteTargetRow> = {},
): DeleteTargetRow => ({
  account_id: "acc-1",
  platform,
  status: "published",
  external_id: "ext-1",
  ...args,
});

describe("buildDeleteTargets – what the smart delete modal offers", () => {
  it("TikTok-only published post (no external_id) → single INFO box, no checkbox", () => {
    const rows = [pub("tiktok", { external_id: null })];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "tiktok", reason: "no_api" },
    ]);
  });

  it("TikTok-only published post WITH external_id → STILL an INFO box (never a checkbox for TikTok)", () => {
    const rows = [pub("tiktok", { external_id: "7081234567" })];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "tiktok", reason: "no_api" },
    ]);
  });

  it("TikTok + Facebook → INFO for TikTok, checkbox for Facebook", () => {
    const rows = [pub("tiktok", { external_id: null }), pub("facebook")];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "tiktok", reason: "no_api" },
      { kind: "checkbox", accountId: "acc-1", platform: "facebook" },
    ]);
  });

  it("TikTok + LinkedIn → both as INFO boxes (no API delete for either)", () => {
    const rows = [pub("tiktok"), pub("linkedin", { account_id: "acc-2" })];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "tiktok", reason: "no_api" },
      { kind: "info", platform: "linkedin", reason: "no_api" },
    ]);
  });

  it("unpublished draft → no targets at all", () => {
    const rows: DeleteTargetRow[] = [
      pub("facebook", { status: "draft" }),
      pub("tiktok", { status: "draft" }),
    ];
    expect(buildDeleteTargets(rows)).toEqual([]);
  });

  it("API-capable platform without external_id → INFO 'no_reference', NOT a useless checkbox", () => {
    const rows = [pub("facebook", { external_id: null })];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "facebook", reason: "no_reference" },
    ]);
  });

  it("API-capable platform without account_id → INFO (cannot target a specific row)", () => {
    const rows = [pub("twitter", { account_id: null })];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "info", platform: "twitter", reason: "no_reference" },
    ]);
  });

  it("several API-capable platforms everywhere → checkboxes, each with its account id", () => {
    const rows = [
      pub("facebook", { account_id: "a1" }),
      pub("instagram", { account_id: "a2" }),
      pub("youtube", { account_id: "a3" }),
      pub("twitter", { account_id: "a4" }),
    ];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "checkbox", accountId: "a1", platform: "facebook" },
      { kind: "checkbox", accountId: "a2", platform: "instagram" },
      { kind: "checkbox", accountId: "a3", platform: "youtube" },
      { kind: "checkbox", accountId: "a4", platform: "twitter" },
    ]);
  });

  it("non-published rows are never offered (mixed list)", () => {
    const rows = [
      pub("facebook", { status: "published" }),
      pub("tiktok", { status: "archived" }),
      pub("linkedin", { status: "failed" }),
    ];
    expect(buildDeleteTargets(rows)).toEqual([
      { kind: "checkbox", accountId: "acc-1", platform: "facebook" },
    ]);
  });
});

describe("DELETE_CAPABILITIES registry (single source of truth)", () => {
  it("API delete enabled for Facebook, Twitter, YouTube, Instagram", () => {
    expect(canDeleteViaApi("facebook")).toBe(true);
    expect(canDeleteViaApi("twitter")).toBe(true);
    expect(canDeleteViaApi("youtube")).toBe(true);
    expect(canDeleteViaApi("instagram")).toBe(true);
  });

  it("API delete DISABLED for LinkedIn and TikTok", () => {
    expect(canDeleteViaApi("linkedin")).toBe(false);
    expect(canDeleteViaApi("tiktok")).toBe(false);
    // The dialog must never be able to ask for an API delete of these.
    const rows = [pub("linkedin"), pub("tiktok")];
    expect(buildDeleteTargets(rows)).toHaveLength(2);
    expect(buildDeleteTargets(rows).every((t) => t.kind === "info")).toBe(true);
  });

  it("unknown platform → no API delete (default-safe)", () => {
    expect(canDeleteViaApi("unknown-network")).toBe(false);
  });

  it("negative-API platforms never yield a delete checkbox, regardless of ids", () => {
    for (const platform of ["linkedin", "tiktok"]) {
      expect(canDeleteViaApi(platform)).toBe(false);
      // Even fully-populated rows (account + external_id) must not offer a checkbox.
      const targets = buildDeleteTargets([pub(platform)]);
      expect(targets.every((t) => t.kind === "info")).toBe(true);
    }
  });
});

describe("platformDisplayName", () => {
  it("maps known platforms to readable names", () => {
    expect(platformDisplayName("tiktok")).toBe("TikTok");
    expect(platformDisplayName("linkedin")).toBe("LinkedIn");
    expect(platformDisplayName("twitter")).toBe("Twitter/X");
  });

  it("falls back to the raw key for unknown platforms", () => {
    expect(platformDisplayName("weird")).toBe("weird");
  });
});