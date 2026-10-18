/**
 * Single source of truth: "can Postio delete a published post on this platform
 * through the platform's API?".
 *
 * Both the UI (`DeletePostDialog` – decides what to offer the user) and the
 * backend (`deleteFromMeta` / `deletePost` – decides whether to call a platform
 * API) read this registry, so there is no duplicated per-platform logic.
 *
 * To change a platform's behaviour, flip its boolean below — one line. The
 * modal and the server pick it up automatically.
 */

export const DELETE_CAPABILITIES: Record<string, boolean> = {
  facebook: true,
  twitter: true,
  youtube: true,
  // Instagram: the Graph API DELETE is attempted, but in practice the API
  // rejects deletion of an already-published media node. The backend treats a
  // failed Instagram call as "manual deletion" — the row is soft-archived and
  // the post stays in Postio (see `deleteFromMeta`). Set to `false` to stop
  // attempting the API call at all.
  instagram: true,
  // LinkedIn: no working API delete (the Community Management API is not
  // authorized for our Developer App) → archive in Postio + manual removal.
  linkedin: false,
  // TikTok: the Content Posting API has no endpoint to delete a published
  // video → never call any API; archive in Postio + manual removal.
  tiktok: false,
};

/** Whether a published post can be removed on `platform` via its API. */
export function canDeleteViaApi(platform: string): boolean {
  return DELETE_CAPABILITIES[platform] ?? false;
}

/** Human-readable platform name used in dialog copy and toasts. */
export const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export function platformDisplayName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform;
}

/** Why a published platform cannot be removed through its API. */
export type DeleteTargetInfoReason = "no_api" | "no_reference";

export type DeleteTarget =
  | {
      kind: "checkbox";
      /** `social_accounts.id` — targets the exact row in `deleteFromMeta`. */
      accountId: string;
      platform: string;
    }
  | {
      kind: "info";
      platform: string;
      reason: DeleteTargetInfoReason;
    };

/** Minimal shape of a `post_platforms` row needed to decide what to offer. */
export interface DeleteTargetRow {
  account_id: string | null;
  platform: string;
  status: string;
  external_id: string | null;
}

/**
 * Decide what the "Smazat příspěvek" dialog offers for a post.
 *
 * A published platform gets an actionable "Smazat z <platforma>" checkbox ONLY
 * when Postio can actually remove it through the platform API (the apiDelete
 * flag) AND the row carries a reference id (`external_id`). Every other
 * published platform is offered as an informational note: the post is archived
 * in Postio and the user removes it manually on the platform.
 *
 * Pure function — no React, no network — so the decision is unit-testable.
 */
export function buildDeleteTargets(rows: DeleteTargetRow[]): DeleteTarget[] {
  const targets: DeleteTarget[] = [];
  for (const row of rows) {
    if (row.status !== "published") continue;
    const apiDelete = canDeleteViaApi(row.platform);
    if (apiDelete && row.account_id && row.external_id) {
      targets.push({
        kind: "checkbox",
        accountId: row.account_id,
        platform: row.platform,
      });
    } else {
      targets.push({
        kind: "info",
        platform: row.platform,
        // API-capable platform but no usable reference id → still manual.
        reason: apiDelete ? "no_reference" : "no_api",
      });
    }
  }
  return targets;
}