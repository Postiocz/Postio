"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * POSTIO – Twitter (X) publisher helpers
 * ---------------------------------------
 * Implements the X API v2 integration for publishing tweets with optional
 * media attachments, plus Media Upload API v1.1 for image uploads.
 *
 * X API basics:
 *  - Tweet creation: `POST https://api.twitter.com/2/tweets`
 *  - Media upload: `POST https://upload.twitter.com/1.1/media/upload.json`
 *  - Tweet deletion: `DELETE https://api.twitter.com/2/tweets/:id`
 *  - Auth: `Authorization: Bearer {access_token}`
 *
 * Token lifecycle:
 *  - X access tokens with `offline.access` scope come with a refresh_token.
 *  - Refresh tokens are long-lived but can be rotated on each refresh.
 *  - `token_expires_at` on `social_accounts` tracks when the current
 *    access_token expires.
 *
 * Platform rules (from AGENTS.md):
 *  - X does NOT support editing tweets via API.
 *  - Deletion IS supported via `DELETE /2/tweets/:id`.
 *  - Free tier = write-only (publish + delete), no timeline reading.
 */

const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_TWEETS_URL = "https://api.twitter.com/2/tweets";
const X_MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";

/**
 * Buffer we subtract from `token_expires_at` before deciding a token is
 * still safe to use. X access tokens typically last 2 hours.
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type SocialAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
  platform_id: string | null;
};

/**
 * Pull the refresh token out of the JSONB metadata blob.
 */
function readRefreshToken(metadata: SocialAccountRow["metadata"]): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).refresh_token;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

/**
 * Exchange an X refresh_token for a fresh access_token.
 *
 * X OAuth 2.0 token endpoint:
 *   POST https://api.twitter.com/2/oauth2/token
 *   Authorization: Basic base64(client_id:client_secret)
 *   grant_type=refresh_token&refresh_token=…
 *
 * Response: { access_token, expires_in, scope }
 * Note: X refresh tokens are long-lived and typically NOT rotated.
 */
async function exchangeRefreshToken(
  refreshToken: string,
): Promise<
  | { success: true; accessToken: string; expiresInSeconds: number }
  | { success: false; error: string }
> {
  const clientId = process.env.TWITTER_CLIENT_ID ?? process.env.X_API_KEY;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? process.env.X_API_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "X OAuth není nakonfigurován (chybí TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET).",
    };
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const res = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
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
      console.error("[X/Twitter] refresh_token exchange failed:", {
        status: res.status,
        reason,
      });
      return {
        success: false,
        error: `X token refresh failed: ${reason}`,
      };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      expiresInSeconds:
        typeof payload.expires_in === "number"
          ? payload.expires_in
          : 2 * 60 * 60, // default 2 hours
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[X/Twitter] refresh_token network error:", msg);
    return {
      success: false,
      error: `X token refresh network error: ${msg}`,
    };
  }
}

/**
 * Return a valid X access token. Refreshes if expired or about to expire.
 */
export async function getValidTwitterAccessToken(params: {
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
        "X access token vypršel a v databázi chybí refresh_token. Uživatel se musí znovu připojit přes X OAuth.",
    };
  }

  console.log("[X/Twitter] refreshing access token", {
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

  // Persist the new access token (keep the same refresh_token – X
  // refresh tokens are long-lived and typically not rotated).
  const newMetadata = {
    ...(account.metadata ?? {}),
    refresh_token: refreshToken,
  };

  const { error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
      metadata: newMetadata,
    })
    .eq("id", account.id);

  if (updateError) {
    console.error("[X/Twitter] failed to persist refreshed token:", updateError.message);
  }

  const updatedAccount: SocialAccountRow = {
    ...account,
    access_token: refreshed.accessToken,
    token_expires_at: newExpiresAt,
    metadata: newMetadata,
  };

  return { success: true, accessToken: refreshed.accessToken, account: updatedAccount };
}

// ---------------------------------------------------------------------
// Media Upload (v1.1 – API v2 does not yet support direct media upload)
// ---------------------------------------------------------------------

/**
 * Upload a single image to X via Media Upload API v1.1.
 *
 * Endpoint: POST https://upload.twitter.com/1.1/media/upload.json
 * Method: multipart/form-data with field `media` containing the binary.
 *
 * Returns the `media_id_string` to attach to the tweet creation request.
 *
 * Reference: https://developer.x.com/docs/x-api/tweets/manage-media/basics
 */
async function uploadMediaToX(params: {
  accessToken: string;
  imageBytes: ArrayBuffer;
  mimeType: string;
}): Promise<{ success: true; mediaId: string } | { success: false; error: string }> {
  const { accessToken, imageBytes, mimeType } = params;

  // Build multipart/form-data manually.
  const boundary = `----XMediaBoundary${Math.random().toString(36).slice(2)}`;
  const separator = `--${boundary}\r\n`;
  const closing = `--${boundary}--\r\n`;

  // Header part for the media field.
  const header = `${separator}Content-Disposition: form-data; name="media"; filename="media.bin"\r\nContent-Type: ${mimeType}\r\n\r\n`;

  // Convert ArrayBuffer to Blob for appending to FormData-like buffer.
  const headerBytes = new TextEncoder().encode(header);
  const separatorBytes = new TextEncoder().encode(separator);
  const closingBytes = new TextEncoder().encode(closing);

  // Build the full body: --boundary\r\nheader\r\n[binary data]--boundary\r\n--boundary--\r\n
  const totalLength =
    separatorBytes.length + headerBytes.length + imageBytes.byteLength + closingBytes.length;

  const body = new Uint8Array(totalLength);
  let offset = 0;

  body.set(separatorBytes, offset);
  offset += separatorBytes.length;

  body.set(headerBytes, offset);
  offset += headerBytes.length;

  body.set(new Uint8Array(imageBytes), offset);
  offset += imageBytes.byteLength;

  body.set(closingBytes, offset);

  try {
    const res = await fetch(X_MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(totalLength),
      },
      body: body.buffer,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[X/Twitter] media upload failed:", {
        status: res.status,
        text: text.slice(0, 300),
      });
      return {
        success: false,
        error: `X media upload failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
      };
    }

    const payload = (await res.json().catch(() => ({}))) as {
      media_id_string?: string;
      media_id?: number;
      processing_info?: unknown;
    };

    const mediaId = payload.media_id_string ?? String(payload.media_id ?? "");
    if (!mediaId) {
      return {
        success: false,
        error: "X media upload succeeded but returned no media_id.",
      };
    }

    console.log("[X/Twitter] ✅ media uploaded:", { mediaId });
    return { success: true, mediaId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[X/Twitter] media upload network error:", msg);
    return { success: false, error: `X media upload error: ${msg}` };
  }
}

// ---------------------------------------------------------------------
// Tweet creation (API v2)
// ---------------------------------------------------------------------

/**
 * Publish a tweet to X via API v2.
 *
 * Endpoint: POST https://api.twitter.com/2/tweets
 * Supports: text-only, text + images (up to 4), text + video (up to 1).
 *
 * Reference: https://developer.x.com/docs/x-api/tweets/make-a-tweet/api-reference
 */
async function publishTweetToX(params: {
  accessToken: string;
  content: string;
  mediaUrls: string[];
}): Promise<{ success: true; externalId: string } | { success: false; error: string }> {
  const { accessToken, content, mediaUrls } = params;

  // Upload all images via Media Upload v1.1 and collect media_ids.
  const mediaIds: string[] = [];
  const imageUrls = mediaUrls.filter((u) => {
    if (typeof u !== "string" || !u.trim()) return false;
    const ext = u.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((e) => ext.endsWith(e));
  });

  for (const imageUrl of imageUrls.slice(0, 4)) {
    // X allows up to 4 images per tweet.
    const urlLower = imageUrl.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
    const mimeType =
      urlLower.endsWith(".png")
        ? "image/png"
        : urlLower.endsWith(".webp")
        ? "image/webp"
        : urlLower.endsWith(".gif")
        ? "image/gif"
        : "image/jpeg";

    let imageBuffer: ArrayBuffer;
    try {
      const srcRes = await fetch(imageUrl, { cache: "no-store" });
      if (!srcRes.ok) {
        console.warn("[X/Twitter] failed to download image:", {
          url: imageUrl,
          status: srcRes.status,
        });
        continue;
      }
      imageBuffer = await srcRes.arrayBuffer();
    } catch (e) {
      console.warn("[X/Twitter] network error downloading image:", e);
      continue;
    }

    if (imageBuffer.byteLength === 0) continue;

    const uploadResult = await uploadMediaToX({
      accessToken,
      imageBytes: imageBuffer,
      mimeType,
    });

    if (uploadResult.success) {
      mediaIds.push(uploadResult.mediaId);
    }
  }

  // Build the tweet payload.
  // X API v2 limit: 280 characters.
  const truncatedContent = content.length > 280 ? content.slice(0, 277) + "..." : content;

  const payload: Record<string, unknown> = {
    text: truncatedContent,
  };

  if (mediaIds.length > 0) {
    payload.media = {
      media_ids: mediaIds,
    };
  }

  console.log("[X/Twitter] sending tweet:", {
    contentLength: truncatedContent.length,
    mediaIds,
  });

  try {
    const res = await fetch(X_TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        data?: { id?: string };
      };

      const tweetId = data?.data?.id;
      if (!tweetId) {
        return {
          success: false,
          error: "X API vrátil úspěch, ale chybí tweet ID.",
        };
      }

      console.log("[X/Twitter] ✅ tweet published:", {
        tweetId,
        tweetUrl: `https://x.com/i/status/${tweetId}`,
      });

      return { success: true, externalId: tweetId };
    }

    // Parse error response.
    const errData = (await res.json().catch(() => ({}))) as {
      errors?: Array<{ message?: string; code?: number }>;
      title?: string;
      detail?: string;
      status?: string;
    };

    const errorMessages = errData.errors
      ?.map((e) => `${e.code ?? "?"}: ${e.message ?? "?"}`)
      .join("; ") ?? errData.detail ?? errData.title ?? `HTTP ${res.status}`;

    console.error("[X/Twitter] tweet creation failed:", {
      status: res.status,
      errors: errData.errors,
    });

    return {
      success: false,
      error: `X publish failed: ${errorMessages}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[X/Twitter] tweet creation network error:", msg);
    return { success: false, error: `X publish network error: ${msg}` };
  }
}

// ---------------------------------------------------------------------
// Public entry point (called from publish.ts)
// ---------------------------------------------------------------------

/**
 * Public entry point used by the Next.js publish router. Takes the raw
 * `social_accounts` row for Twitter plus the post content / media,
 * ensures the access token is fresh, and publishes the tweet.
 *
 * Returns the same shape as the other publishers so the shared
 * `handlePublishSuccess` / `handlePublishError` flow in `publish.ts`
 * can stay unchanged.
 */
export async function publishToTwitterAction(params: {
  account: SocialAccountRow;
  content: string;
  mediaUrls: string[];
  location?: string | null;
  tags?: string[];
  /** If set, must be empty – the post is considered already published. */
  existingExternalId?: string | null;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { account, content, mediaUrls, location, tags, existingExternalId } = params;

  // 0) Duplicate-upload guard.
  if (typeof existingExternalId === "string" && existingExternalId.trim()) {
    console.warn(
      `[publishToTwitterAction] Refusing duplicate publish – post already has X external_id=${existingExternalId}`,
    );
    return {
      success: false,
      error: "Příspěvek je již publikován na X (Twitter) (duplicate publish blocked).",
    };
  }

  // 1) Refresh / fetch a valid access token.
  const tokenResult = await getValidTwitterAccessToken({ account });
  if (!tokenResult.success) {
    return { success: false, error: tokenResult.error };
  }

  // 2) Build final caption: content + location + hashtags.
  // X has a 280-char limit – truncation happens in publishTweetToX.
  const parts: string[] = [content.trim()];

  if (location?.trim()) {
    parts.push(`📍 ${location.trim()}`);
  }

  const normalizedTags = Array.isArray(tags)
    ? tags.filter((t) => typeof t === "string" && t.trim())
    : [];
  if (normalizedTags.length > 0) {
    const hashtagLine = normalizedTags
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
    parts.push(hashtagLine);
  }

  const finalContent = parts.join("\n");

  // 3) Publish via API v2.
  return publishTweetToX({
    accessToken: tokenResult.accessToken,
    content: finalContent,
    mediaUrls,
  });
}
