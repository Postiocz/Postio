"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * POSTIO – YouTube publisher helpers
 * ----------------------------------
 * Implements the YouTube Data API v3 integration for uploading videos
 * (with the goal of being treated as Shorts when the source clip is
 * vertical and ≤ 60 s – YouTube detects this automatically based on the
 * actual video metadata, we only help by adding "#Shorts" to the
 * description which is the documented hint).
 *
 * Token lifecycle:
 *  - Google access tokens for the YouTube scope expire after ~1 hour.
 *  - The `refresh_token` is stored in `social_accounts.metadata` and is
 *    the only thing that survives longer sessions.
 *  - `token_expires_at` on `social_accounts` is the cached expiry we
 *    use to decide whether to call the refresh endpoint before the
 *    publish call (we add a 5-minute safety buffer).
 *
 * The helpers below are platform-specific (Next.js / Edge Deno versions
 * are kept in sync, see `supabase/functions/process-scheduled-posts/index.ts`
 * for the Deno port).
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos";

/**
 * Buffer we subtract from `token_expires_at` before deciding a token is
 * still safe to use. Google access tokens technically last 1 hour, but
 * clocks drift and network round-trips eat into that window. 5 minutes
 * is the same buffer the Google APIs Node.js client uses internally.
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type SocialAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Pull the refresh token out of the JSONB metadata blob with a defensive
 * type narrowing (Postgres JSONB comes back as `unknown` in @supabase/ssr).
 */
function readRefreshToken(metadata: SocialAccountRow["metadata"]): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).refresh_token;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

/**
 * Exchange a Google `refresh_token` for a fresh `access_token`.
 * Returns the new access token + expires_in (seconds), or a structured
 * error so callers can route it back into `handlePublishError`.
 *
 * Required env (server-only, never NEXT_PUBLIC_):
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 */
async function exchangeRefreshToken(refreshToken: string): Promise<
  | {
      success: true;
      accessToken: string;
      expiresInSeconds: number;
      scope?: string;
    }
  | { success: false; error: string }
> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error:
        "Google OAuth není nakonfigurován (chybí GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !payload.access_token) {
      const reason =
        payload.error_description || payload.error || `HTTP ${res.status}`;
      console.error("[YouTube] refresh_token exchange failed:", {
        status: res.status,
        reason,
        payload,
      });
      return {
        success: false,
        error: `Google token refresh failed: ${reason}`,
      };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      expiresInSeconds: typeof payload.expires_in === "number" ? payload.expires_in : 3600,
      scope: payload.scope,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[YouTube] refresh_token network error:", msg);
    return {
      success: false,
      error: `Google token refresh network error: ${msg}`,
    };
  }
}

/**
 * Public helper: return a YouTube access token that is safe to use for
 * the next publish call. If the stored token is missing, already expired,
 * or about to expire within the safety buffer, this function transparently
 * refreshes it via the stored `refresh_token` and writes the new value
 * back to `social_accounts` (using the admin client to bypass RLS).
 *
 * IMPORTANT: this only refreshes the token when necessary. If the cached
 * token is still valid, we return it as-is to avoid burning Google
 * rate-limit quota.
 */
export async function getValidYouTubeAccessToken(params: {
  account: SocialAccountRow;
}): Promise<
  | { success: true; accessToken: string; account: SocialAccountRow }
  | { success: false; error: string }
> {
  const { account } = params;
  const supabaseAdmin = createAdminClient();

  const now = Date.now();
  const expiresAtMs = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Fast path: token present and not within the refresh buffer.
  if (account.access_token && expiresAtMs - now > TOKEN_REFRESH_BUFFER_MS) {
    return { success: true, accessToken: account.access_token, account };
  }

  // Slow path: need to refresh.
  const refreshToken = readRefreshToken(account.metadata);
  if (!refreshToken) {
    return {
      success: false,
      error:
        "YouTube access token vypršel a v databázi chybí refresh_token. Uživatel se musí znovu připojit přes Google OAuth.",
    };
  }

  console.log("[YouTube] refreshing access token", {
    accountId: account.id,
    expiresAt: account.token_expires_at,
  });

  const refreshed = await exchangeRefreshToken(refreshToken);
  if (!refreshed.success) {
    return { success: false, error: refreshed.error };
  }

  const newExpiresAt = new Date(
    now + refreshed.expiresInSeconds * 1000,
  ).toISOString();

  // Persist new token + expiry. We deliberately do NOT touch metadata.refresh_token:
  // Google does not return a new refresh token on refresh-token exchanges, and
  // overwriting with undefined would destroy the still-valid one.
  const { error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
    })
    .eq("id", account.id);

  if (updateError) {
    console.error("[YouTube] failed to persist refreshed token:", updateError.message);
    // Non-fatal: return the token anyway, the publish call would still work,
    // we just lose the persistence benefit until the next request.
  }

  const updatedAccount: SocialAccountRow = {
    ...account,
    access_token: refreshed.accessToken,
    token_expires_at: newExpiresAt,
  };

  return { success: true, accessToken: refreshed.accessToken, account: updatedAccount };
}

type YouTubeVideoInsertResponse = {
  id?: string;
  snippet?: { title?: string };
  status?: { uploadStatus?: string };
  error?: { message?: string; code?: number; errors?: Array<{ message?: string }> };
};

/**
 * Publish a single video to YouTube via the resumable upload protocol.
 *
 * YouTube requires a multi-step upload (cannot POST a video URL directly
 * the way Meta does). The flow is:
 *
 *   1. POST to the resumable upload URL with JSON metadata (snippet,
 *      status, …). Google returns the `Location` header containing the
 *      one-shot session URI.
 *   2. PUT the raw video bytes to that session URI with the correct
 *      Content-Type. Google streams the upload, processes it and
 *      returns the final `videos` resource (with the new `id`).
 *
 * Postio stores the video at a public Supabase Storage URL, so we stream
 * the bytes through `fetch().then(r => r.arrayBuffer())`. For very large
 * files this would benefit from a streaming proxy, but a single Shorts
 * clip is typically a few MB and well within the 256 GB YouTube limit.
 */
async function publishToYouTube(params: {
  accessToken: string;
  videoUrl: string;
  title: string;
  description?: string;
}): Promise<{ success: true; externalId: string } | { success: false; error: string }> {
  const { accessToken, videoUrl, title, description } = params;

  // -- Step 1: fetch the source video into memory --
  let videoBuffer: ArrayBuffer;
  try {
    const srcRes = await fetch(videoUrl, { cache: "no-store" });
    if (!srcRes.ok) {
      return {
        success: false,
        error: `Video soubor na URL ${videoUrl} se nepodařilo stáhnout (HTTP ${srcRes.status}).`,
      };
    }
    videoBuffer = await srcRes.arrayBuffer();
  } catch (e) {
    return {
      success: false,
      error: `Síťová chyba při stahování videa: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (videoBuffer.byteLength === 0) {
    return { success: false, error: "Video soubor je prázdný (0 bytů)." };
  }

  // -- Step 2: initiate resumable upload with metadata --
  // YouTube automatically classifies a video as a Short when:
  //   - the video is vertical (≤ 9:16 aspect ratio)
  //   - the duration is ≤ 60 seconds
  // We cannot control aspect / duration from the API, but adding "#Shorts"
  // to the description is the documented hint that boosts discoverability
  // on the Shorts shelf.
  const snippet = {
    title: title.slice(0, 100), // YouTube title hard limit
    description: (description ?? "").slice(0, 5000), // hard limit
    categoryId: "22", // "People & Blogs" – safest default, can be overridden later
  };
  const status = {
    privacyStatus: "public",
    selfDeclaredMadeForKids: false,
    embeddable: true,
  };

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(videoBuffer.byteLength),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({ snippet, status }),
      cache: "no-store",
    },
  );

  if (!initRes.ok) {
    const errPayload = (await initRes.json().catch(() => ({}))) as YouTubeVideoInsertResponse;
    const reason =
      errPayload.error?.message ||
      (Array.isArray(errPayload.error?.errors) && errPayload.error?.errors[0]?.message) ||
      `YouTube init upload failed (HTTP ${initRes.status})`;
    console.error("[YouTube] resumable init failed:", { status: initRes.status, errPayload });
    return { success: false, error: reason };
  }

  const sessionUri = initRes.headers.get("Location");
  if (!sessionUri) {
    return {
      success: false,
      error: "YouTube nevrátil Location header pro resumable upload session.",
    };
  }

  // -- Step 3: PUT the actual video bytes --
  const uploadRes = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
    cache: "no-store",
  });

  if (!uploadRes.ok) {
    const errPayload = (await uploadRes.json().catch(() => ({}))) as YouTubeVideoInsertResponse;
    const reason =
      errPayload.error?.message ||
      (Array.isArray(errPayload.error?.errors) && errPayload.error?.errors[0]?.message) ||
      `YouTube upload failed (HTTP ${uploadRes.status})`;
    console.error("[YouTube] video bytes upload failed:", { status: uploadRes.status, errPayload });
    return { success: false, error: reason };
  }

  const finalPayload = (await uploadRes.json().catch(() => ({}))) as YouTubeVideoInsertResponse;
  if (!finalPayload.id) {
    return {
      success: false,
      error: "YouTube upload vrátil 200, ale bez video ID.",
    };
  }

  console.log("[YouTube] ✅ upload success:", {
    videoId: finalPayload.id,
    title: finalPayload.snippet?.title,
    uploadStatus: finalPayload.status?.uploadStatus,
  });

  return { success: true, externalId: finalPayload.id };
}

/**
 * Verify that a YouTube video still exists on the channel. Used by the
 * sync routines in `posts.ts` (syncPostStatus / syncPublishedPosts) to
 * decide whether a published `post_platforms` row should be marked as
 * `removed_externally`.
 *
 * IMPORTANT – YouTube processing states:
 *   - After upload, the video goes through `processing` then `uploaded`.
 *     During this window `videos.list` already returns the video with
 *     `status.uploadStatus ∈ {"processing", "uploaded"}`.
 *   - These are LEGITIMATE states, NOT a sign of external removal.
 *     If Postio marked them as `removed_externally`, the user would be
 *     allowed to click "Publikovat" again and the same video would be
 *     uploaded a second time → duplicate on the channel.
 *   - Only when `videos.list` returns 404 OR an empty `items[]` array
 *     do we conclude the video was actually deleted externally.
 *
 * Returns one of three reasons so the caller can log it:
 *   - "exists"   – video is still on YouTube (any uploadStatus)
 *   - "missing"  – 404 or items.length === 0 (definitively deleted)
 *   - "error"    – network/auth failure; caller should NOT mark as
 *                  removed_externally (we just skip this sync iteration)
 */
export async function checkYouTubeVideoExists(params: {
  accessToken: string;
  videoId: string;
}): Promise<
  | { exists: true; uploadStatus: string | null }
  | { exists: false; reason: "not_found" }
  | { exists: null; reason: "error"; error: string }
> {
  const { accessToken, videoId } = params;

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "status");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[YouTube] videos.list network error:", msg);
    return { exists: null, reason: "error", error: msg };
  }

  // 404 → YouTube Data API v3 returns 404 when the video does not exist
  // (e.g. user deleted it from YouTube Studio or it never finished processing
  // and was purged). This is the only signal we treat as definitive removal.
  if (res.status === 404) {
    return { exists: false, reason: "not_found" };
  }

  // Other non-OK statuses (401 invalid token, 403 quota, 5xx, …) – do NOT
  // treat as removal. Caller should leave status="published" intact and
  // try again on the next sync tick.
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
    };
    const reason =
      payload.error?.message || `YouTube videos.list failed (HTTP ${res.status})`;
    console.error("[YouTube] videos.list non-OK:", { status: res.status, reason });
    return { exists: null, reason: "error", error: reason };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    items?: Array<{ id?: string; status?: { uploadStatus?: string } }>;
  };
  const items = Array.isArray(payload.items) ? payload.items : [];

  // Empty items[] is YouTube's way of saying "I don't know that video" –
  // we treat it identically to 404.
  if (items.length === 0) {
    return { exists: false, reason: "not_found" };
  }

  // Video exists – report the uploadStatus so we can log it (but never
  // treat "processing" / "uploaded" / "failed" as a removal signal).
  const uploadStatus = items[0]?.status?.uploadStatus ?? null;
  return { exists: true, uploadStatus };
}

/**
 * Build the description for the YouTube video. We append "#Shorts" so
 * YouTube's classifier treats the upload as a Short whenever the video
 * is short and vertical (which we expect in the Postio vertical creator
 * use-case). The location is included on its own line, hashtags are
 * preserved as the user typed them.
 */
function buildYouTubeDescription(params: {
  content: string;
  location?: string | null;
  tags?: string[];
}): string {
  const parts: string[] = [params.content.trim()];

  if (params.location?.trim()) {
    parts.push(`📍 ${params.location.trim()}`);
  }

  const normalizedTags = Array.isArray(params.tags)
    ? params.tags.filter((t) => typeof t === "string" && t.trim())
    : [];
  if (normalizedTags.length > 0) {
    const hashtagLine = normalizedTags
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    parts.push(hashtagLine);
  }

  // Hint to YouTube – only useful for videos that are actually ≤60s and
  // vertical, but never harmful otherwise (a non-Short simply gets
  // ignored by the Shorts shelf algorithm).
  parts.push("#Shorts");

  return parts.join("\n");
}

/**
 * Public entry point used by the Next.js publish router. Takes the raw
 * social_accounts row for YouTube plus the post content / media, ensures
 * the access token is fresh, and uploads the video.
 *
 * Returns the same shape as the Instagram / Facebook publishers so the
 * shared `handlePublishSuccess` / `handlePublishError` flow can stay
 * unchanged.
 *
 * Defense-in-depth duplicate-upload guard: if `existingExternalId` is
 * passed (the caller has already looked up `post_platforms.external_id`
 * for this post + YouTube channel), the upload is refused. This is a
 * belt-and-suspenders measure on top of the guard in `publishPost` /
 * `publishAdditionalPlatforms` – it protects against any future caller
 * (cron, edge function, manual trigger) that bypasses the high-level
 * guard.
 */
export async function publishToYouTubeAction(params: {
  account: SocialAccountRow;
  content: string;
  mediaUrls: string[];
  location?: string | null;
  tags?: string[];
  /** If set, must be empty – the post is considered already published. */
  existingExternalId?: string | null;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { account, content, mediaUrls, location, tags, existingExternalId } = params;

  // 0) Duplicate-upload guard (belt-and-suspenders, see JSDoc above).
  if (typeof existingExternalId === "string" && existingExternalId.trim()) {
    console.warn(
      `[publishToYouTubeAction] Refusing duplicate upload – post already has YouTube external_id=${existingExternalId}`,
    );
    return {
      success: false,
      error: "Příspěvek je již publikován na YouTube (duplicate upload blocked).",
    };
  }

  // 1) Must have a video – YouTube does not allow text-only uploads.
  const firstMedia = mediaUrls.find((u) => typeof u === "string" && u.trim());
  if (!firstMedia) {
    return {
      success: false,
      error: "YouTube vyžaduje alespoň jedno video.",
    };
  }
  const mediaUrl = firstMedia.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
  const looksLikeVideo =
    mediaUrl.endsWith(".mp4") ||
    mediaUrl.endsWith(".mov") ||
    mediaUrl.endsWith(".m4v") ||
    mediaUrl.endsWith(".webm") ||
    mediaUrl.endsWith(".mkv");
  if (!looksLikeVideo) {
    return {
      success: false,
      error: "YouTube vyžaduje video soubor (mp4/mov/m4v/webm/mkv).",
    };
  }

  // 2) Refresh / fetch a valid access token (covers both the on-demand
  //    "Publikovat" button and the scheduled edge function path).
  const tokenResult = await getValidYouTubeAccessToken({ account });
  if (!tokenResult.success) {
    return { success: false, error: tokenResult.error };
  }

  // 3) Upload to YouTube.
  const description = buildYouTubeDescription({ content, location, tags });
  return publishToYouTube({
    accessToken: tokenResult.accessToken,
    videoUrl: firstMedia,
    title: content,
    description,
  });
}