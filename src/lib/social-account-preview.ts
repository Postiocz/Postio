// Pure helpers shared by the preview/edit dialogs and the server actions that
// feed them.
//
// Why this module exists: `social_accounts.metadata` is a JSONB column that
// also holds secrets — TikTok `refresh_token`, Facebook Page `access_token`
// and YouTube `refresh_token`. A client component that selects `metadata`
// therefore ships those tokens to the browser. The dialogs only ever needed
// the cached TikTok creator handle, so the DB read moved to a server action
// (`src/lib/actions/social-account-preview-actions.ts`) and the browser now
// receives the sanitized shape defined here — never `metadata`.

export type PreviewPlatform =
  | "facebook"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "tiktok"
  | "twitter";

/** Platforms that have a high-fidelity preview renderer. */
export const PREVIEWABLE_PLATFORMS: readonly PreviewPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
  "tiktok",
  "twitter",
];

/**
 * The only shape a social account may take in a client component.
 * Deliberately has no `metadata` field, so a token can never ride along by
 * accident when a caller spreads the object or serializes it.
 */
export type SafeSocialAccount = {
  platform: string;
  account_name: string;
  avatar_url: string | null;
  /** TikTok creator handle resolved server-side, `null` for other platforms. */
  tiktokUsername: string | null;
};

export type SocialAccountRowForPreview = {
  platform?: string | null;
  account_name?: string | null;
  avatar_url?: string | null;
  metadata?: unknown;
};

/**
 * Lowercased, whitespace-free handle without a leading `@`.
 * Returns `null` for empty/blank values.
 */
export function normalizeTikTokHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const handle = raw.trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
  return handle || null;
}

/**
 * Reads `metadata.creator_info_cache.creator_username` — the handle cached by
 * `creator_info/query`. Anything malformed yields `null` instead of throwing.
 */
export function readCachedTikTokUsername(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const cache = (metadata as Record<string, unknown>).creator_info_cache;
  if (!cache || typeof cache !== "object") return null;
  const username = (cache as Record<string, unknown>).creator_username;
  return typeof username === "string" ? username : null;
}

/**
 * TikTok handle for a row: the cached creator username first, then the
 * account name. Non-TikTok rows are always `null`. Matches what the preview
 * dialog used to compute in the browser (cached value trimmed, account-name
 * fallback compacted and lowercased).
 */
export function resolveTikTokUsername(
  row: SocialAccountRowForPreview | null | undefined,
): string | null {
  if (row?.platform !== "tiktok") return null;

  const cached = readCachedTikTokUsername(row.metadata)?.trim().replace(/^@/, "");
  if (cached) return cached;

  return normalizeTikTokHandle(row.account_name);
}

/**
 * Maps a DB row to the client-safe payload. `metadata` (and with it every
 * token stored there) is dropped; only the resolved handle survives.
 */
export function mapSocialAccountForPreview(
  row: SocialAccountRowForPreview,
): SafeSocialAccount {
  return {
    platform: row.platform ?? "",
    account_name: row.account_name ?? "",
    avatar_url: row.avatar_url ?? null,
    tiktokUsername: resolveTikTokUsername(row),
  };
}