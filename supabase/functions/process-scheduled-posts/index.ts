import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.6.3";

function getApiKey(request: Request): string | null {
  const apiKey = request.headers.get("apikey") ?? request.headers.get("Apikey");
  return apiKey?.trim() || null;
}

function getBearerToken(request: Request): string | null {
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

async function verifyServiceRoleJwt(params: { token: string; supabaseUrl: string }) {
  const jwks = createRemoteJWKSet(
    new URL(`${params.supabaseUrl}/auth/v1/.well-known/jwks.json`)
  );

  const verified = await jwtVerify(params.token, jwks);
  const role = (verified.payload as Record<string, unknown>).role;

  if (role !== "service_role") {
    throw new Error("JWT does not have service_role");
  }

  return verified;
}

function isLikelyJwt(token: string) {
  return token.split(".").length === 3;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getSupabaseSecretKeys(): Record<string, string> | null {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const record: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") record[k] = v;
    }
    return Object.keys(record).length > 0 ? record : null;
  } catch {
    return null;
  }
}

function keyMatchesAny(params: { provided: string; expected: string[] }) {
  for (const key of params.expected) {
    if (timingSafeEqual(params.provided, key)) return true;
  }
  return false;
}

function detectMediaType(mediaUrls: unknown): "text" | "photo" | "video" {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return "text";
  const first = mediaUrls[0];
  if (typeof first !== "string" || !first.trim()) return "text";
  const withoutHash = first.split("#")[0] ?? "";
  const withoutQuery = (withoutHash.split("?")[0] ?? "").toLowerCase();

  if (withoutQuery.endsWith(".mp4") || withoutQuery.endsWith(".mov")) return "video";
  if (
    withoutQuery.endsWith(".jpg") ||
    withoutQuery.endsWith(".png") ||
    withoutQuery.endsWith(".webp")
  ) {
    return "photo";
  }

  return "text";
}

/**
 * Build the final caption: content + location + hashtags
 */
function buildFinalCaption(params: {
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

  return parts.join("\n");
}

async function publishToFacebook(
  accessToken: string,
  platformId: string,
  content: string,
  mediaType: "text" | "photo" | "video",
  mediaUrls: string[]
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(platformId)}`;

  try {
    if (mediaType === "video") {
      // Single video publish
      const mediaUrl = mediaUrls[0] ?? "";
      const body = new URLSearchParams();
      body.set("file_url", mediaUrl);
      body.set("description", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [video]`, { platformId, mediaUrl });
      const res = await fetch(`${base}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [video]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };

    } else if (mediaType === "photo" && mediaUrls.length > 1) {
      // Multi-photo gallery: upload each as unpublished, then publish via /feed with attached_media
      console.log(">>> Nahrávám galerii s počtem fotek:", mediaUrls.length);

      const mediaIds: string[] = [];
      for (let i = 0; i < mediaUrls.length; i++) {
        const uploadBody = new URLSearchParams();
        uploadBody.set("url", mediaUrls[i]);
        uploadBody.set("published", "false");
        uploadBody.set("access_token", accessToken);

        const uploadRes = await fetch(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: uploadBody,
        });
        const uploadPayload = await uploadRes.json().catch(() => ({}));
        console.log(`>>> Upload photo ${i + 1}:`, { status: uploadRes.status, payload: uploadPayload });

        if (!uploadRes.ok) {
          const uploadErr = typeof uploadPayload?.error?.message === "string" ? uploadPayload.error.message : `Upload failed (${uploadRes.status})`;
          return { success: false, error: `Upload photo ${i + 1} failed: ${uploadErr}` };
        }

        const photoId = typeof uploadPayload?.id === "string" ? uploadPayload.id : undefined;
        if (!photoId) return { success: false, error: `Upload photo ${i + 1} returned no ID.` };
        mediaIds.push(photoId);
      }

      // Publish feed with attached_media
      const feedBody = new URLSearchParams();
      feedBody.set("message", content);
      feedBody.set("attached_media", JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))));
      feedBody.set("access_token", accessToken);

      console.log(">>> PUBLIKUJI GALERII...", { mediaIds });
      const feedRes = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: feedBody,
      });
      const feedPayload = await feedRes.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [gallery]`, { status: feedRes.status, payload: feedPayload });

      if (!feedRes.ok) {
        const feedErr = typeof feedPayload?.error?.message === "string" ? feedPayload.error.message : `Feed publish failed (${feedRes.status})`;
        return { success: false, error: feedErr };
      }
      const externalId = typeof feedPayload?.id === "string" ? feedPayload.id : undefined;
      return { success: true, externalId };

    } else if (mediaType === "photo" && mediaUrls.length === 1) {
      // Single photo (fast path)
      const body = new URLSearchParams();
      body.set("url", mediaUrls[0]);
      body.set("caption", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [photo]`, { platformId, mediaUrl: mediaUrls[0] });
      const res = await fetch(`${base}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [photo]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };

    } else {
      // Text-only publish
      const body = new URLSearchParams();
      body.set("message", content);
      body.set("access_token", accessToken);

      console.log(`>>> Publishing to Facebook [text]`, { platformId, contentLength: content.length });
      const res = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await res.json().catch(() => ({}));
      console.log(`>>> Facebook Graph API response [text]`, { status: res.status, payload });

      if (!res.ok) {
        const errorMessage = typeof payload?.error?.message === "string" ? payload.error.message : `Facebook API error (${res.status})`;
        return { success: false, error: errorMessage };
      }
      const externalId = typeof payload?.id === "string" ? payload.id : undefined;
      return { success: true, externalId };
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown Facebook publish error";
    console.log(`>>> Facebook publish failed [${mediaType}]`, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Publish a post to Instagram via the two-phase IG Container process.
 * Phase 1: Create container (/{ig_user_id}/media)
 * Phase 2: Publish container (/{ig_user_id}/media_publish)
 */
async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  content: string,
  mediaUrls: string[]
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  // Instagram requires at least one image or video
  if (mediaUrls.length === 0) {
    return { success: false, error: "Instagram vyžaduje alespoň jeden obrázek nebo video." };
  }

  const mediaType = detectMediaType(mediaUrls);
  const baseUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}`;

  // --- Phase 1: Create Media Container ---
  console.log(">>> Vytvářím IG kontejner...", { igUserId, mediaType, mediaUrls });

  const containerBody = new URLSearchParams();
  containerBody.set("access_token", accessToken);
  containerBody.set("caption", content);

  const mediaUrl = mediaUrls[0];

  if (mediaType === "video") {
    containerBody.set("video_url", mediaUrl);
    containerBody.set("media_type", "REELS");
  } else {
    containerBody.set("image_url", mediaUrl);
    containerBody.set("media_type", "IMAGE");
  }

  const containerRes = await fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerBody,
  });

  const containerPayload = await containerRes.json().catch(() => ({}));
  console.log(">>> META RESPONSE (IG container):", { status: containerRes.status, payload: containerPayload });

  if (!containerRes.ok) {
    const containerErr = typeof containerPayload?.error?.message === "string" ? containerPayload.error.message : `IG container creation failed (${containerRes.status})`;
    return { success: false, error: containerErr };
  }

  const creationId = typeof containerPayload?.id === "string" ? containerPayload.id : undefined;
  if (!creationId) {
    return { success: false, error: "IG container creation returned no ID." };
  }

  console.log(">>> IG kontejner vytvořen, creation_id:", creationId);

  // Wait for Instagram to process the media
  const waitMs = mediaType === "video" ? 10_000 : 3_000;
  await new Promise((r) => setTimeout(r, waitMs));

  // --- Phase 2: Publish Container ---
  console.log(">>> Publikuji IG kontejner...", { creationId });

  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", creationId);
  publishBody.set("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
  });

  const publishPayload = await publishRes.json().catch(() => ({}));
  console.log("🔥 META RESPONSE (IG publish):", { status: publishRes.status, payload: publishPayload });

  if (!publishRes.ok) {
    const publishErr = typeof publishPayload?.error?.message === "string" ? publishPayload.error.message : `IG publish failed (${publishRes.status})`;
    return { success: false, error: publishErr };
  }

  // Instagram media_publish returns { "id": "17841405876543214" }
  // This is the actual post ID on Instagram – we MUST store it for deletion.
  const publishedId = typeof publishPayload?.id === "string" ? publishPayload.id : undefined;

  if (publishedId) {
    console.log("🔥 IG PUBLISH SUCCESS, final external_id:", publishedId);
    return { success: true, externalId: publishedId };
  }

  // Fallback: if media_publish returned OK but no 'id', use creation_id.
  // This can happen with certain Meta API versions. creation_id is still usable
  // for deletion via Graph API.
  console.warn("⚠️ IG publish returned no 'id' – falling back to creation_id:", creationId);
  return { success: true, externalId: creationId };
}

/**
 * ============================================================
 * YouTube Data API v3 – refresh token + upload (Deno port)
 * ============================================================
 *
 * Same logic as `src/lib/actions/publish-youtube.ts` but rewritten for the
 * Edge runtime (Deno). The two implementations MUST stay in sync.
 *
 * Differences vs the Next.js helper:
 *   - Uses `Deno.env.get(...)` instead of `process.env`.
 *   - Uses a raw `supabaseAdmin` (already created in this file) instead
 *     of calling `createAdminClient()` from `@/lib/supabase/server`.
 *
 * Token lifecycle is identical: Google access tokens live ~1h, the
 * `refresh_token` lives in `social_accounts.metadata` (JSONB), and we
 * transparently refresh before publish if the cached token is within the
 * safety buffer.
 */
const YOUTUBE_REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function refreshYouTubeAccessToken(
  refreshToken: string,
): Promise<
  | {
      success: true;
      accessToken: string;
      expiresInSeconds: number;
    }
  | { success: false; error: string }
> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "Google OAuth není nakonfigurován (GOOGLE_CLIENT_ID/SECRET).",
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !payload.access_token) {
      const reason =
        payload.error_description || payload.error || `HTTP ${res.status}`;
      console.error(">>> [YouTube] refresh failed:", { status: res.status, reason });
      return { success: false, error: `Google token refresh failed: ${reason}` };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      expiresInSeconds:
        typeof payload.expires_in === "number" ? payload.expires_in : 3600,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(">>> [YouTube] refresh network error:", msg);
    return { success: false, error: `Google token refresh network error: ${msg}` };
  }
}

/**
 * Look up the user's YouTube account row, ensure the access token is
 * fresh (refreshing via refresh_token if needed), persist the new
 * value, and return it ready-to-use.
 *
 * Note on types: `supabaseAdmin` is typed as the Deno port of the
 * Supabase client (`SupabaseClient<any, "public", ...>`), while
 * `ReturnType<typeof createClient>` uses a narrower generic. We
 * accept the Deno-side type here directly so the function compiles
 * without the @supabase/supabase-js full Database generic.
 */
// deno-lint-ignore no-explicit-any
type DenoSupabaseClient = any;

async function getValidYouTubeAccessToken(params: {
  supabaseAdmin: DenoSupabaseClient;
  userId: string;
}): Promise<
  | {
      success: true;
      accessToken: string;
      account: {
        id: string;
        access_token: string;
        token_expires_at: string | null;
        metadata: Record<string, unknown> | null;
      };
    }
  | { success: false; error: string }
> {
  const { supabaseAdmin, userId } = params;

  const { data: accountsRaw, error: lookupError } = await supabaseAdmin
    .from("social_accounts")
    .select("id, access_token, token_expires_at, metadata")
    .eq("user_id", userId)
    .ilike("platform", "youtube")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const accounts = accountsRaw as Array<{
    id: string;
    access_token: string;
    token_expires_at: string | null;
    metadata: Record<string, unknown> | null;
  }> | null;

  if (lookupError || !accounts?.[0]?.access_token) {
    return {
      success: false,
      error: lookupError?.message ?? "Chybí propojený YouTube kanál (access_token).",
    };
  }

  const account = accounts[0];

  const now = Date.now();
  const expiresAtMs = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Fast path – token still safe to use.
  if (expiresAtMs - now > YOUTUBE_REFRESH_BUFFER_MS) {
    return { success: true, accessToken: account.access_token, account };
  }

  // Slow path – need to refresh.
  const refreshTokenRaw = (account.metadata as Record<string, unknown> | null)?.refresh_token;
  if (typeof refreshTokenRaw !== "string" || !refreshTokenRaw.trim()) {
    return {
      success: false,
      error:
        "YouTube access token vypršel a v databázi chybí refresh_token. Uživatel se musí znovu připojit přes Google OAuth.",
    };
  }

  const refreshed = await refreshYouTubeAccessToken(refreshTokenRaw);
  if (!refreshed.success) {
    return { success: false, error: refreshed.error };
  }

  const newExpiresAt = new Date(now + refreshed.expiresInSeconds * 1000).toISOString();

  // Persist refreshed token. Do NOT overwrite metadata.refresh_token.
  const { error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
    })
    .eq("id", account.id);

  if (updateError) {
    console.warn(">>> [YouTube] failed to persist refreshed token (non-fatal):", updateError.message);
  }

  return {
    success: true,
    accessToken: refreshed.accessToken,
    account: { ...account, access_token: refreshed.accessToken, token_expires_at: newExpiresAt },
  };
}

/**
 * Upload a single video to YouTube using the resumable upload protocol.
 * Identical algorithm to the Next.js helper – see comments there.
 */
async function publishToYouTube(params: {
  accessToken: string;
  videoUrl: string;
  title: string;
  description?: string;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { accessToken, videoUrl, title, description } = params;

  // 1) Fetch source video bytes
  let videoBuffer: ArrayBuffer;
  try {
    const srcRes = await fetch(videoUrl);
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

  const snippet = {
    title: title.slice(0, 100),
    description: (description ?? "").slice(0, 5000),
    categoryId: "22",
  };
  const status = {
    privacyStatus: "public",
    selfDeclaredMadeForKids: false,
    embeddable: true,
  };

  // 2) Initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(videoBuffer.byteLength),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({ snippet, status }),
    },
  );

  if (!initRes.ok) {
    const errPayload = (await initRes.json().catch(() => ({}))) as {
      error?: { message?: string; errors?: Array<{ message?: string }> };
    };
    const reason =
      errPayload.error?.message ||
      (Array.isArray(errPayload.error?.errors) && errPayload.error?.errors[0]?.message) ||
      `YouTube init upload failed (HTTP ${initRes.status})`;
    console.error(">>> [YouTube] resumable init failed:", { status: initRes.status, reason });
    return { success: false, error: reason };
  }

  const sessionUri = initRes.headers.get("Location");
  if (!sessionUri) {
    return { success: false, error: "YouTube nevrátil Location header." };
  }

  // 3) PUT the actual video bytes
  const uploadRes = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const errPayload = (await uploadRes.json().catch(() => ({}))) as {
      error?: { message?: string; errors?: Array<{ message?: string }> };
    };
    const reason =
      errPayload.error?.message ||
      (Array.isArray(errPayload.error?.errors) && errPayload.error?.errors[0]?.message) ||
      `YouTube upload failed (HTTP ${uploadRes.status})`;
    console.error(">>> [YouTube] upload failed:", { status: uploadRes.status, reason });
    return { success: false, error: reason };
  }

  const finalPayload = (await uploadRes.json().catch(() => ({}))) as {
    id?: string;
  };

  if (!finalPayload.id) {
    return { success: false, error: "YouTube upload vrátil 200, ale bez video ID." };
  }

  console.log(">>> [YouTube] ✅ upload success, videoId:", finalPayload.id);
  return { success: true, externalId: finalPayload.id };
}

// ---------------------------------------------------------------------
// LinkedIn publisher helpers (Deno port of src/lib/actions/publish-linkedin.ts)
// ---------------------------------------------------------------------
//
// LinkedIn UGC Posts API:
//   - POST https://api.linkedin.com/v2/ugcPosts
//   - Header: X-Restli-Protocol-Version: 2.0.0 (REQUIRED)
//   - Author: urn:li:person:{openIdSub} – we already store this in
//     social_accounts.platform_id (set during OAuth callback).
//   - For images: POST /v2/assets?action=registerUpload → PUT binary
//     bytes to the returned uploadUrl → reference urn:li:image:{asset}
//     in the ugcPost body.
//   - Video posts are NOT supported in v1 (need a separate /v2/videos
//     flow). LinkedIn text posts support up to 3000 characters of
//     shareCommentary.

const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const LINKEDIN_ASSETS_URL =
  "https://api.linkedin.com/v2/assets?action=registerUpload";
const LINKEDIN_RESTLI_VERSION = "2.0.0";
// LinkedIn access tokens live for 60 days. 1 day refresh buffer keeps
// us safely inside that window while not burning refresh quota.
const LINKEDIN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000;

async function refreshLinkedInAccessToken(
  refreshToken: string,
): Promise<
  | {
      success: true;
      accessToken: string;
      expiresInSeconds: number;
      newRefreshToken?: string;
    }
  | { success: false; error: string }
> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error:
        "LinkedIn OAuth není nakonfigurován (chybí LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET).",
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const res = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !payload.access_token) {
      const reason =
        payload.error_description || payload.error || `HTTP ${res.status}`;
      console.error(">>> [LinkedIn] refresh failed:", {
        status: res.status,
        reason,
      });
      return {
        success: false,
        error: `LinkedIn token refresh failed: ${reason}`,
      };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      expiresInSeconds: typeof payload.expires_in === "number"
        ? payload.expires_in
        : 60 * 24 * 60 * 60,
      newRefreshToken: payload.refresh_token,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(">>> [LinkedIn] refresh network error:", msg);
    return {
      success: false,
      error: `LinkedIn token refresh network error: ${msg}`,
    };
  }
}

/**
 * Look up the user's LinkedIn account, ensure the access token is fresh
 * (refreshing via refresh_token if needed), persist the new value, and
 * return it ready-to-use. Returns the account row so callers can read
 * `platform_id` to build the author URN.
 */
async function getValidLinkedInAccessToken(params: {
  supabaseAdmin: DenoSupabaseClient;
  userId: string;
}): Promise<
  | {
      success: true;
      accessToken: string;
      account: {
        id: string;
        access_token: string;
        token_expires_at: string | null;
        metadata: Record<string, unknown> | null;
        platform_id: string | null;
      };
    }
  | { success: false; error: string }
> {
  const { supabaseAdmin, userId } = params;

  const { data: accountsRaw, error: lookupError } = await supabaseAdmin
    .from("social_accounts")
    .select("id, access_token, token_expires_at, metadata, platform_id")
    .eq("user_id", userId)
    .ilike("platform", "linkedin")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const accounts = accountsRaw as Array<{
    id: string;
    access_token: string;
    token_expires_at: string | null;
    metadata: Record<string, unknown> | null;
    platform_id: string | null;
  }> | null;

  if (lookupError || !accounts?.[0]?.access_token) {
    return {
      success: false,
      error: lookupError?.message ??
        "Chybí propojený LinkedIn účet (access_token).",
    };
  }

  const account = accounts[0];

  const now = Date.now();
  const expiresAtMs = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Fast path – token still safe to use.
  if (expiresAtMs - now > LINKEDIN_REFRESH_BUFFER_MS) {
    return {
      success: true,
      accessToken: account.access_token,
      account,
    };
  }

  // Slow path – refresh.
  const refreshTokenRaw = (account.metadata as Record<string, unknown> | null)
    ?.refresh_token;
  if (typeof refreshTokenRaw !== "string" || !refreshTokenRaw.trim()) {
    return {
      success: false,
      error:
        "LinkedIn access token vypršel a v databázi chybí refresh_token. Uživatel se musí znovu připojit přes LinkedIn OAuth.",
    };
  }

  const refreshed = await refreshLinkedInAccessToken(refreshTokenRaw);
  if (!refreshed.success) {
    return { success: false, error: refreshed.error };
  }

  const newExpiresAt = new Date(
    now + refreshed.expiresInSeconds * 1000,
  ).toISOString();

  // LinkedIn may rotate the refresh_token. Persist the new one if we
  // received it; otherwise keep the existing one (do not overwrite with
  // undefined → null in the JSONB blob).
  const newMetadata: Record<string, unknown> = {
    ...((account.metadata as Record<string, unknown> | null) ?? {}),
  };
  if (typeof refreshed.newRefreshToken === "string" && refreshed.newRefreshToken.trim()) {
    newMetadata.refresh_token = refreshed.newRefreshToken;
  }

  const { error: updateError } = await supabaseAdmin
    .from("social_accounts")
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
      metadata: newMetadata,
    })
    .eq("id", account.id);

  if (updateError) {
    console.warn(
      ">>> [LinkedIn] failed to persist refreshed token (non-fatal):",
      updateError.message,
    );
  }

  return {
    success: true,
    accessToken: refreshed.accessToken,
    account: {
      ...account,
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt,
      metadata: newMetadata,
    },
  };
}

/**
 * Build the final LinkedIn post text: content + 📍 location + hashtags.
 * Truncated to 3000 chars (LinkedIn hard limit on shareCommentary.text).
 */
function buildLinkedInContent(params: {
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

  const full = parts.join("\n\n");
  return full.length > 3000 ? full.slice(0, 2997) + "..." : full;
}

/**
 * Register a LinkedIn image asset (the two-step "recipe" + binary PUT
 * dance) and return the asset URN that must be referenced from the
 * ugcPost body.
 */
async function registerLinkedInImageAsset(params: {
  accessToken: string;
  authorUrn: string;
  imageBytes: ArrayBuffer;
  mimeType: string;
}): Promise<{ success: true; assetUrn: string } | { success: false; error: string }> {
  const { accessToken, authorUrn, imageBytes, mimeType } = params;

  // LinkedIn's `/v2/assets?action=registerUpload` expects `recipes` to be
  // an ARRAY OF URN STRINGS (not objects!), plus TOP-LEVEL
  // `serviceRelationships` (an array of `{ identifier, relationshipType }`)
  // and TOP-LEVEL `supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]` for
  // a single-shot image upload. See the official Vector Assets API docs:
  // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api
  //
  // Sending `recipes: [{ relationshipType, recipe }]` (objects) returns
  // HTTP 403 + `serviceErrorCode 100`:
  //   "Field Value validation failed in REQUEST_BODY: Data Processing
  //    Exception while processing fields
  //    [/registerUploadRequest/recipes/serviceRelationships]"
  //
  // This is the Deno port of the Next.js helper
  // (src/lib/actions/publish-linkedin.ts) – keep them in sync.
  const registerBody = {
    registerUploadRequest: {
      owner: authorUrn,
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [
        {
          identifier: "urn:li:userGeneratedContent",
          relationshipType: "OWNER",
        },
      ],
      supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
    },
  };

  const registerRes = await fetch(LINKEDIN_ASSETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": LINKEDIN_RESTLI_VERSION,
    },
    body: JSON.stringify(registerBody),
  });

  if (!registerRes.ok) {
    const text = await registerRes.text().catch(() => "");
    console.error(">>> [LinkedIn] assets.registerUpload failed:", {
      status: registerRes.status,
      text,
    });
    return {
      success: false,
      error: `LinkedIn asset registration failed (HTTP ${registerRes.status}): ${text.slice(0, 300)}`,
    };
  }

  const registerPayload = (await registerRes.json().catch(() => ({}))) as {
    value?: {
      asset?: string;
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
          uploadUrl?: string;
        };
      };
    };
  };

  const uploadUrl =
    registerPayload.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;
  const assetUrn = registerPayload.value?.asset;

  if (!uploadUrl || !assetUrn) {
    return {
      success: false,
      error:
        "LinkedIn asset registration did not return an uploadUrl/asset URN.",
    };
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(imageBytes.byteLength),
    },
    body: imageBytes,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    console.error(">>> [LinkedIn] asset binary upload failed:", {
      status: uploadRes.status,
      text,
    });
    return {
      success: false,
      error: `LinkedIn asset upload failed (HTTP ${uploadRes.status}): ${text.slice(0, 300)}`,
    };
  }

  return { success: true, assetUrn };
}

/**
 * Publish a single post to LinkedIn via the UGC Posts API.
 *
 * Supports:
 *  - text-only posts
 *  - single-image posts (first image attachment)
 *  - video posts are NOT supported in v1
 */
async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  content: string;
  mediaUrls: string[];
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { accessToken, authorUrn, content, mediaUrls } = params;

  const firstMedia = mediaUrls.find((u) => typeof u === "string" && u.trim());

  let mediaCategory: "NONE" | "IMAGE" = "NONE";
  let mediaUrn: string | null = null;

  if (firstMedia) {
    const urlLower = firstMedia.split("#")[0]?.split("?")[0]?.toLowerCase() ?? "";
    const isVideo =
      urlLower.endsWith(".mp4") ||
      urlLower.endsWith(".mov") ||
      urlLower.endsWith(".m4v") ||
      urlLower.endsWith(".webm") ||
      urlLower.endsWith(".mkv");
    const isImage =
      urlLower.endsWith(".jpg") ||
      urlLower.endsWith(".jpeg") ||
      urlLower.endsWith(".png") ||
      urlLower.endsWith(".webp") ||
      urlLower.endsWith(".gif");

    if (isVideo) {
      return {
        success: false,
        error:
          "LinkedIn v této verzi nepodporuje video příspěvky. Použijte obrázek nebo text bez médií.",
      };
    }

    if (isImage) {
      // Download the image bytes once and run the LinkedIn asset
      // registration + binary upload dance.
      let imageBuffer: ArrayBuffer;
      try {
        const srcRes = await fetch(firstMedia);
        if (!srcRes.ok) {
          return {
            success: false,
            error: `Obrázek na URL ${firstMedia} se nepodařilo stáhnout (HTTP ${srcRes.status}).`,
          };
        }
        imageBuffer = await srcRes.arrayBuffer();
      } catch (e) {
        return {
          success: false,
          error: `Síťová chyba při stahování obrázku: ${e instanceof Error ? e.message : String(e)}`,
        };
      }

      if (imageBuffer.byteLength === 0) {
        return { success: false, error: "Obrázek je prázdný (0 bytů)." };
      }

      const mimeType = urlLower.endsWith(".png")
        ? "image/png"
        : urlLower.endsWith(".webp")
          ? "image/webp"
          : urlLower.endsWith(".gif")
            ? "image/gif"
            : "image/jpeg";

      const assetResult = await registerLinkedInImageAsset({
        accessToken,
        authorUrn,
        imageBytes: imageBuffer,
        mimeType,
      });
      if (!assetResult.success) {
        return { success: false, error: assetResult.error };
      }
      mediaCategory = "IMAGE";
      mediaUrn = assetResult.assetUrn;
    }
  }

  // Build the ugcPosts payload.
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: content },
    shareMediaCategory: mediaCategory,
  };

  if (mediaCategory === "IMAGE" && mediaUrn) {
    shareContent.media = [
      {
        status: "READY",
        description: { text: content.slice(0, 200) },
        media: mediaUrn,
        title: { text: content.slice(0, 100) },
      },
    ];
  }

  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent,
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(LINKEDIN_UGC_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": LINKEDIN_RESTLI_VERSION,
    },
    body: JSON.stringify(payload),
  });

  // 201 Created on success. The post URN is in the `x-restli-id` header.
  if (res.status === 201) {
    const externalId = res.headers.get("x-restli-id");
    if (!externalId) {
      return {
        success: false,
        error: "LinkedIn vrátil 201 Created, ale chybí hlavička x-restli-id.",
      };
    }
    console.log(">>> [LinkedIn] ✅ publish success, postUrn:", externalId);
    return { success: true, externalId };
  }

  const errPayload = (await res.json().catch(() => ({}))) as {
    message?: string;
    status?: number;
  };
  const reason = errPayload.message ||
    `LinkedIn ugcPosts failed (HTTP ${res.status})`;
  console.error(">>> [LinkedIn] publish failed:", {
    status: res.status,
    payload: errPayload,
  });
  return { success: false, error: reason };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "authorization,apikey,content-type",
      },
    });
  }

  console.log(">>> Checking for scheduled posts...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const explicitAdminKey =
    Deno.env.get("POSTIO_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeys = getSupabaseSecretKeys();
  const defaultSecretKey = secretKeys?.default ?? null;

  const adminKey = explicitAdminKey ?? defaultSecretKey;

  if (!supabaseUrl || !adminKey) {
    return Response.json(
      { error: "Missing SUPABASE_URL or an admin API key" },
      { status: 500 }
    );
  }

  const expectedKeys = [
    ...(explicitAdminKey ? [explicitAdminKey] : []),
    ...(secretKeys ? Object.values(secretKeys) : []),
  ];

  const apiKey = getApiKey(request);
  const token = getBearerToken(request);

  try {
    if (apiKey) {
      if (!keyMatchesAny({ provided: apiKey, expected: expectedKeys })) {
        throw new Error("API key mismatch");
      }
      console.log("process-scheduled-posts auth ok (apikey)");
    } else if (token) {
      if (isLikelyJwt(token)) {
        const verified = await verifyServiceRoleJwt({ token, supabaseUrl });
        console.log("process-scheduled-posts auth ok (jwt)", {
          alg: verified.protectedHeader.alg,
          kid: verified.protectedHeader.kid,
          role: (verified.payload as Record<string, unknown>).role,
        });
      } else {
        if (!keyMatchesAny({ provided: token, expected: expectedKeys })) {
          throw new Error("Secret key mismatch");
        }
        console.log("process-scheduled-posts auth ok (secret key)");
      }
    } else {
      return Response.json({ error: "Missing apikey header" }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  console.log(">>> Service Role Key initialized:", {
    hasKey: !!adminKey,
    keyPrefix: adminKey?.slice(0, 10) ?? "none",
    supabaseUrl,
  });

  const { data: allAccounts, error: allAccountsError } = await supabaseAdmin
    .from("social_accounts")
    .select("user_id, platform, is_active, platform_id");

  console.log("=== VŠECHNY ÚČTY V social_accounts ===", {
    error: allAccountsError,
    count: allAccounts?.length ?? 0,
    accounts: JSON.stringify(allAccounts),
  });

  const nowIso = new Date().toISOString();

  const { data: platformsToPublish, error: platformsError } = await supabaseAdmin
    .from("post_platforms")
    .select("id, post_id, platform, status, scheduled_at, posts(id, user_id, content, media_urls, location, tags)")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (platformsError) {
    console.log("process-scheduled-posts query error", { message: platformsError.message });
    return Response.json({ error: platformsError.message }, { status: 500 });
  }

  console.log(`>>> Found ${platformsToPublish?.length ?? 0} scheduled post_platforms(s) to process`);

  if (!platformsToPublish || platformsToPublish.length === 0) {
    console.log(">>> No scheduled post_platforms to process, exiting early");
    return Response.json(
      {
        ok: true,
        now: nowIso,
        totalFound: 0,
        published: 0,
        skipped: 0,
        failed: 0,
      },
      {
        status: 200,
        headers: { "access-control-allow-origin": "*" },
      }
    );
  }

  // Lock all selected platforms immediately to prevent duplicate processing
  // If another instance of this function runs at the same time, it won't find these
  const ppIds = platformsToPublish.map((p) => p.id);
  console.log(`>>> Locking ${ppIds.length} post_platforms(s): scheduled → publishing`, { ppIds });

  const { error: lockError } = await supabaseAdmin
    .from("post_platforms")
    .update({ status: "publishing" })
    .in("id", ppIds)
    .eq("status", "scheduled");

  if (lockError) {
    console.log(">>> Failed to lock post_platforms", { error: lockError.message });
    return Response.json(
      { error: "Failed to lock post_platforms for processing", detail: lockError.message },
      { status: 500 }
    );
  }

  console.log(`>>> post_platforms locked successfully. Starting publish process...`);

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const pp of platformsToPublish) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const post = Array.isArray(pp.posts) ? pp.posts[0] : pp.posts;
      if (!post) {
        console.log(`>>> Post data missing for post_platforms ${pp.id}`);
        continue;
      }

      console.log(`>>> Processing post_platforms: ${pp.id} (Post: ${post.id}, Platform: ${pp.platform})`, {
        hasMedia: Array.isArray(post.media_urls) && post.media_urls.length > 0,
        scheduledAt: pp.scheduled_at,
      });

      const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
      const rawContent = String(post.content ?? "");
      const rawLocation = (post as { location?: string | null }).location ?? null;
      const rawTags = (Array.isArray((post as { tags?: unknown }).tags) ? (post as { tags?: string[] }).tags : []) ?? [];

      // Build final caption: content + location + hashtags
      const finalCaption = buildFinalCaption({
        content: rawContent,
        location: rawLocation,
        tags: rawTags,
      });

      let externalId: string | null = null;
      let publishError: string | null = null;

      const targetPlatform = pp.platform;

      if (targetPlatform === "instagram") {
        // --- Instagram publish ---
        console.log(`>>> Hledám Instagram účet pro user_id: ${post.user_id}`);

        const { data: igAccounts, error: igAccountError } = await supabaseAdmin
          .from("social_accounts")
          .select("access_token, platform_id")
          .eq('user_id', post.user_id)
          .ilike('platform', 'instagram')
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log(`>>> Instagram account lookup result:`, {
          igAccountError,
          accountsFound: igAccounts?.length ?? 0,
        });

        if (igAccountError || !igAccounts?.[0]?.access_token || !igAccounts?.[0]?.platform_id) {
          publishError = igAccountError?.message ?? "Chybí propojený Instagram účet (platform_id / access_token).";
          console.log(`>>> Instagram account error for post ${post.id}`, { error: publishError });
        } else {
          const igAccount = igAccounts[0];
          const result = await publishToInstagram(
            igAccount.access_token,
            igAccount.platform_id,
            finalCaption,
            mediaUrls
          );

          if (!result.success) {
            publishError = result.error ?? "Instagram publish failed";
            console.log(`>>> Instagram publish failed for post ${post.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> Instagram publish success for post ${post.id}`, { externalId });
          }
        }
      } else if (targetPlatform === "facebook") {
        // --- Facebook publish ---
        console.log(`Hledám účet pro user_id: ${post.user_id} (type: ${typeof post.user_id}) a platformu: facebook (target: ${targetPlatform})`);

        const { data: accounts, error: accountError } = await supabaseAdmin
          .from("social_accounts")
          .select("access_token, platform_id")
          .eq('user_id', post.user_id)
          .ilike('platform', 'facebook')
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        console.log(`>>> Facebook account lookup result:`, {
          accountError,
          accountsFound: accounts?.length ?? 0,
          accounts,
        });

        if (accountError || !accounts?.[0]?.access_token || !accounts?.[0]?.platform_id) {
          if (!accounts || accounts.length === 0) {
            publishError = `CHYBA: Účet pro uživatele ${post.user_id} nebyl v social_accounts nalezen.`;
            console.log(`>>> ${publishError}`);
          } else {
            publishError = (accountError as { message?: string } | null)?.message ?? "Missing Facebook account (access_token/platform_id)";
            console.log(`>>> Facebook account error for post_platforms ${pp.id}`, { error: publishError });
          }
        } else {
          const account = accounts[0];
          const mediaType = detectMediaType(mediaUrls);
          const filteredUrls = mediaType === "text" ? [] : mediaUrls;

          const result = await publishToFacebook(
            account.access_token,
            account.platform_id,
            finalCaption,
            mediaType,
            filteredUrls
          );

          if (!result.success) {
            publishError = result.error ?? "Facebook publish failed";
            console.log(`>>> Facebook publish failed for post_platforms ${pp.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> Facebook publish success for post_platforms ${pp.id}`, { externalId });
          }
        }
      } else if (targetPlatform === "youtube") {
        // --- YouTube publish (scheduled / background) ---
        // Requires at least one video URL. For scheduled posts the edge
        // function is invoked by cron, so the access token may have
        // expired since the user scheduled the post – we therefore
        // transparently refresh via `getValidYouTubeAccessToken` before
        // attempting the upload.
        const firstYouTubeMedia = mediaUrls.find((u: unknown) => typeof u === "string" && (u as string).trim());
        if (!firstYouTubeMedia) {
          publishError = "YouTube vyžaduje alespoň jedno video.";
          console.log(`>>> YouTube skipped for post_platforms ${pp.id}: no video media`);
        } else {
          const ytToken = await getValidYouTubeAccessToken({
            supabaseAdmin,
            userId: post.user_id,
          });

          if (!ytToken.success) {
            publishError = ytToken.error;
            console.log(`>>> YouTube token error for post_platforms ${pp.id}`, { error: publishError });
          } else {
            // Build description: content + location + hashtags + #Shorts hint
            const descParts: string[] = [rawContent.trim()];
            if (rawLocation?.trim()) {
              descParts.push(`📍 ${rawLocation.trim()}`);
            }
            if (rawTags.length > 0) {
              const hashtags = rawTags
                .map((t: string) => (t.startsWith("#") ? t : `#${t}`))
                .join(" ");
              descParts.push(hashtags);
            }
            descParts.push("#Shorts");

            const result = await publishToYouTube({
              accessToken: ytToken.accessToken,
              videoUrl: firstYouTubeMedia as string,
              title: rawContent,
              description: descParts.join("\n"),
            });

            if (!result.success) {
              publishError = result.error ?? "YouTube publish failed";
              console.log(`>>> YouTube publish failed for post_platforms ${pp.id}`, { error: publishError });
            } else {
              externalId = result.externalId ?? null;
              console.log(`>>> YouTube publish success for post_platforms ${pp.id}`, { externalId });
            }
          }
        }
      } else if (targetPlatform === "linkedin") {
        // --- LinkedIn publish (scheduled / background) ---
        // LinkedIn UGC Posts API. Supports:
        //   - text-only posts
        //   - single-image posts (first image attachment, see
        //     publish-linkedin.ts for the asset-recipe + binary-PUT flow)
        //   - video posts are NOT supported in v1 (would need a separate
        //     /v2/videos upload flow)
        // Access tokens live for 60 days, but the cron may run weeks
        // after the user scheduled the post – we therefore transparently
        // refresh via `getValidLinkedInAccessToken` before publish so a
        // scheduled LinkedIn post never silently fails with 401.
        const liToken = await getValidLinkedInAccessToken({
          supabaseAdmin,
          userId: post.user_id,
        });

        if (!liToken.success) {
          publishError = liToken.error;
          console.log(`>>> LinkedIn token error for post_platforms ${pp.id}`, { error: publishError });
        } else {
          const liContent = buildLinkedInContent({
            content: rawContent,
            location: rawLocation,
            tags: rawTags,
          });

          const result = await publishToLinkedIn({
            accessToken: liToken.accessToken,
            authorUrn: `urn:li:person:${liToken.account.platform_id ?? ""}`,
            content: liContent,
            mediaUrls: mediaUrls as string[],
          });

          if (!result.success) {
            publishError = result.error ?? "LinkedIn publish failed";
            console.log(`>>> LinkedIn publish failed for post_platforms ${pp.id}`, { error: publishError });
          } else {
            externalId = result.externalId ?? null;
            console.log(`>>> LinkedIn publish success for post_platforms ${pp.id}`, { externalId });
          }
        }
      } else {
        publishError = `Unsupported platform: ${targetPlatform}`;
      }

      console.log(`🚀 ARCHITEKTURA: Aktualizuji post_platforms ${targetPlatform} -> ${publishError ? 'failed' : 'published'}`);

      const ppUpdateValues: Record<string, unknown> = {
        status: publishError ? "failed" : "published",
        published_at: publishError ? null : nowIso,
        external_id: externalId,
        publish_error: publishError ?? null,
      };

      const { error: ppUpdateError } = await supabaseAdmin
        .from("post_platforms")
        .update(ppUpdateValues)
        .eq("id", pp.id)
        .eq("status", "publishing");

      if (ppUpdateError) {
        failed += 1;
        console.log("process-scheduled-posts update post_platforms failed", {
          ppId: pp.id,
          message: ppUpdateError.message,
        });
        continue;
      }

      if (!publishError) {
        const { error: analyticsError } = await supabaseAdmin
          .from("analytics")
          .insert({ post_id: post.id });

        if (analyticsError) {
          console.log("process-scheduled-posts analytics insert failed", {
            postId: post.id,
            message: analyticsError.message,
          });
        }
      }

      if (publishError) {
        failed += 1;
      } else {
        published += 1;
      }
    } catch (error) {
      failed += 1;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log("process-scheduled-posts unexpected error", {
        ppId: pp.id,
        message: errorMsg,
      });

      await supabaseAdmin
        .from("post_platforms")
        .update({ status: "failed", publish_error: errorMsg })
        .eq("id", pp.id)
        .eq("status", "publishing");
    }
  }

  console.log("process-scheduled-posts done", {
    totalFound: platformsToPublish?.length ?? 0,
    published,
    skipped,
    failed,
  });

  return Response.json(
    {
      ok: true,
      now: nowIso,
      totalFound: platformsToPublish?.length ?? 0,
      published,
      skipped,
      failed,
    },
    {
      status: 200,
      headers: { "access-control-allow-origin": "*" },
    }
  );
});
