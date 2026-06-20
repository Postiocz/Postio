"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * POSTIO – LinkedIn publisher helpers
 * ------------------------------------
 * Implements the LinkedIn UGC Posts API integration for creating posts
 * on behalf of the authenticated user.
 *
 * LinkedIn API basics:
 *  - Author URN: `urn:li:person:{openIdSub}` – the OpenID Connect subject
 *    returned from `/v2/userinfo`. We already store this in
 *    `social_accounts.platform_id` during the OAuth callback.
 *  - Endpoint: `POST https://api.linkedin.com/v2/ugcPosts`
 *  - Headers: `Authorization: Bearer …`, `Content-Type: application/json`,
 *    `X-Restli-Protocol-Version: 2.0.0` (REQUIRED – LinkedIn API rejects
 *    requests without it with HTTP 400).
 *  - For image attachments we must first register an asset via
 *    `POST https://api.linkedin.com/v2/assets?action=registerUpload`,
 *    then PUT the binary bytes to the `uploadUrl` returned in the
 *    recipe, and only THEN reference the asset URN in the ugcPosts body.
 *  - LinkedIn does NOT support editing the text of an already published
 *    post (matches the project rule "LinkedIn: editace textu není
 *    podporována"). Deletion is supported via
 *    `DELETE /v2/ugcPosts/{id}`.
 *
 * Token lifecycle:
 *  - LinkedIn access tokens expire after 60 days.
 *  - `refresh_token` is stored in `social_accounts.metadata` (JSONB blob)
 *    and is required to mint fresh access tokens.
 *  - `token_expires_at` on `social_accounts` is the cached expiry we use
 *    to decide whether to call the refresh endpoint before publishing.
 *
 * The helpers below mirror the YouTube publisher
 * (`src/lib/actions/publish-youtube.ts`) so the calling code in
 * `publish.ts` and the Deno edge function stay consistent.
 */

const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const LINKEDIN_ASSETS_URL = "https://api.linkedin.com/v2/assets?action=registerUpload";
const LINKEDIN_RESTLI_VERSION = "2.0.0";

/**
 * Buffer we subtract from `token_expires_at` before deciding a token is
 * still safe to use. LinkedIn tokens technically last 60 days, but clocks
 * drift and network round-trips eat into that window. 1 day is plenty –
 * the same buffer Postio uses for other 60-day platforms (and well below
 * LinkedIn's documented 60-day lifetime).
 */
const TOKEN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000;

/**
 * Supported media kinds for the LinkedIn publisher. LinkedIn's UGC API
 * supports text-only and image posts out of the box. Videos require a
 * separate API contract (`/v2/videos` + a much more complex 4-step upload
 * dance) which is out of scope for this first version – we log a clear
 * error so the UI does not silently drop the video.
 */
export type LinkedInMediaKind = "text" | "image" | "video" | "unknown";

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
 * Pull the refresh token out of the JSONB metadata blob with a defensive
 * type narrowing (Postgres JSONB comes back as `unknown` in @supabase/ssr).
 */
function readRefreshToken(metadata: SocialAccountRow["metadata"]): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).refresh_token;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

/**
 * Exchange a LinkedIn `refresh_token` for a fresh `access_token`.
 *
 * LinkedIn's token endpoint:
 *   POST https://www.linkedin.com/oauth/v2/accessToken
 *   Content-Type: application/x-www-form-urlencoded
 *   grant_type=refresh_token&refresh_token=…&client_id=…&client_secret=…
 *
 * The response shape matches the authorization-code exchange:
 *   { access_token, expires_in, refresh_token, refresh_token_expires_in, scope }
 *
 * Note: LinkedIn's refresh-token rotation policy is documented as
 * returning a NEW refresh_token on every successful refresh. We must NOT
 * overwrite the existing one unless we actually receive a fresh value
 * (same defensive pattern as YouTube).
 */
async function exchangeRefreshToken(refreshToken: string): Promise<
  | {
      success: true;
      accessToken: string;
      expiresInSeconds: number;
      refreshToken?: string;
    }
  | { success: false; error: string }
> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

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
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
      serviceErrorCode?: number;
    };

    if (!res.ok || !payload.access_token) {
      const reason =
        payload.error_description || payload.error || `HTTP ${res.status}`;
      console.error("[LinkedIn] refresh_token exchange failed:", {
        status: res.status,
        reason,
        payload,
      });
      return {
        success: false,
        error: `LinkedIn token refresh failed: ${reason}`,
      };
    }

    return {
      success: true,
      accessToken: payload.access_token,
      expiresInSeconds: typeof payload.expires_in === "number" ? payload.expires_in : 60 * 24 * 60 * 60,
      refreshToken: payload.refresh_token,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[LinkedIn] refresh_token network error:", msg);
    return {
      success: false,
      error: `LinkedIn token refresh network error: ${msg}`,
    };
  }
}

/**
 * Public helper: return a LinkedIn access token that is safe to use for
 * the next publish call. If the stored token is missing, already expired,
 * or about to expire within the safety buffer, this function transparently
 * refreshes it via the stored `refresh_token` and writes the new value
 * back to `social_accounts` (using the admin client to bypass RLS).
 *
 * IMPORTANT: this only refreshes the token when necessary. If the cached
 * token is still valid, we return it as-is to avoid burning LinkedIn
 * rate-limit quota. We also never overwrite the stored refresh_token
 * unless the refresh response actually returned a new one.
 */
export async function getValidLinkedInAccessToken(params: {
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
        "LinkedIn access token vypršel a v databázi chybí refresh_token. Uživatel se musí znovu připojit přes LinkedIn OAuth.",
    };
  }

  console.log("[LinkedIn] refreshing access token", {
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

  // LinkedIn may return a rotated refresh_token in the response. If it
  // does, persist it; otherwise keep the old one. Same defensive pattern
  // as YouTube.
  const newRefreshToken = refreshed.refreshToken ?? refreshToken;
  const newMetadata = {
    ...(account.metadata ?? {}),
    refresh_token: newRefreshToken,
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
    console.error("[LinkedIn] failed to persist refreshed token:", updateError.message);
    // Non-fatal: return the token anyway, the publish call would still work,
    // we just lose the persistence benefit until the next request.
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
// Image upload (LinkedIn requires a multi-step recipe before ugcPosts)
// ---------------------------------------------------------------------

type AssetRecipe = {
  uploadUrl: string;
  assetUrn: string;
};

/**
 * LinkedIn requires registering an image asset before it can be attached
 * to a ugcPost. The flow is:
 *
 *   1. POST /v2/assets?action=registerUpload with the owner URN and
 *      `recipes[].recipe = "urn:li:digitalmediaRecipe:feedshare-image"`
 *      → returns `value.uploadMechanism.{...}.uploadUrl` plus
 *      `value.asset` (the URN we reference from the ugcPost).
 *   2. PUT the raw image bytes to that `uploadUrl`. LinkedIn returns
 *      201 Created on success.
 *
 * We return the asset URN so the caller can splice it into the ugcPost
 * body. Multiple images would require multiple assets – Postio currently
 * publishes only the FIRST image to LinkedIn (LinkedIn's UGC API only
 * supports up to 9 images via separate assets, but the photo carousel
 * flow needs `category: "IMAGE"` with multiple media entries – we keep
 * the v1 simple with just one).
 */
async function registerLinkedInImageAsset(params: {
  accessToken: string;
  authorUrn: string;
  imageBytes: ArrayBuffer;
  mimeType: string;
}): Promise<{ success: true; recipe: AssetRecipe } | { success: false; error: string }> {
  const { accessToken, authorUrn, imageBytes, mimeType } = params;

  // Step 1: register the upload.
  // LinkedIn's `/v2/assets?action=registerUpload` expects `recipes` to be
  // an ARRAY OF URN STRINGS (not objects!), plus TOP-LEVEL
  // `serviceRelationships` (an array of `{ identifier, relationshipType }`)
  // and TOP-LEVEL `supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]` for
  // a single-shot image upload. See the official Vector Assets API docs:
  // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api
  //
  // If we instead send `recipes: [{ relationshipType, recipe }]` (objects)
  // – a common pattern documented for older LinkedIn API endpoints –
  // LinkedIn responds with HTTP 403 + `serviceErrorCode 100`:
  //   "Field Value validation failed in REQUEST_BODY: Data Processing
  //    Exception while processing fields
  //    [/registerUploadRequest/recipes/serviceRelationships]"
  // because the validator walks into each recipe entry looking for a
  // `serviceRelationships` key (which is actually a sibling, not a child).
  //
  // Verified by direct LinkedIn API test (.dbg/li-test.js, June 2026):
  // the structure below returns HTTP 200 with `value.asset` and
  // `value.uploadMechanism` populated.
  //
  // Note: the newer `/rest/assets?action=registerUpload` endpoint shown in
  // current Microsoft Learn docs ALSO uses this structure, but it requires
  // partner-API approval (`w_member_social` + Marketing Developer Platform
  // onboarding). Postio uses the still-supported `/v2/assets` endpoint,
  // which does not require partner approval for a logged-in member.
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
    cache: "no-store",
  });

  if (!registerRes.ok) {
    const text = await registerRes.text().catch(() => "");
    console.error("[LinkedIn] assets.registerUpload failed:", {
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
          headers?: Record<string, string>;
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
      error: "LinkedIn asset registration did not return an uploadUrl/asset URN.",
    };
  }

  // Step 2: PUT the binary image bytes. LinkedIn expects the exact
  // Content-Type from the registration step (typically image/jpeg or
  // image/png). We forward `mimeType` as supplied by the caller.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(imageBytes.byteLength),
    },
    body: imageBytes,
    cache: "no-store",
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    console.error("[LinkedIn] asset binary upload failed:", {
      status: uploadRes.status,
      text,
    });
    return {
      success: false,
      error: `LinkedIn asset upload failed (HTTP ${uploadRes.status}): ${text.slice(0, 300)}`,
    };
  }

  return {
    success: true,
    recipe: { uploadUrl, assetUrn },
  };
}

// ---------------------------------------------------------------------
// ugcPosts – the actual publish call
// ---------------------------------------------------------------------

type LinkedInUgcPostResponse = {
  id?: string;
  // LinkedIn returns errors under `serviceErrorCode` + `message`.
  message?: string;
  status?: number;
};

/**
 * Publish a single post to LinkedIn via the UGC Posts API.
 *
 * Supports:
 *  - text-only posts (no media) → `text.text` field
 *  - single-image posts (first media URL, if it's an image MIME)
 *  - single-video posts are intentionally NOT supported in this version
 *    (would need a 4-step dance with /v2/videos + asset recipe
 *    `urn:li:digitalmediaRecipe:feedshare-video`). The caller should
 *    detect this case and skip LinkedIn.
 */
async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  content: string;
  mediaUrls: string[];
}): Promise<{ success: true; externalId: string } | { success: false; error: string }> {
  const { accessToken, authorUrn, content, mediaUrls } = params;

  // Pick the first media URL (LinkedIn UGC v1 publishes only one image
  // per post). If the URL points to a video we surface a clear error
  // because that path requires a separate video upload flow.
  const firstMedia = mediaUrls.find((u) => typeof u === "string" && u.trim());

  let mediaCategory: "NONE" | "IMAGE" | "VIDEO" = "NONE";
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
      // Download the image bytes once, then run the LinkedIn asset
      // registration + binary upload dance.
      let imageBuffer: ArrayBuffer;
      try {
        const srcRes = await fetch(firstMedia, { cache: "no-store" });
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

      const mimeType =
        urlLower.endsWith(".png") ? "image/png" :
        urlLower.endsWith(".webp") ? "image/webp" :
        urlLower.endsWith(".gif") ? "image/gif" :
        "image/jpeg";

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
      mediaUrn = assetResult.recipe.assetUrn;
    }
  }

  // Build the ugcPosts payload. LinkedIn's UGC shape:
  //   {
  //     author: "urn:li:person:{id}",
  //     lifecycleState: "PUBLISHED",
  //     specificContent: {
  //       "com.linkedin.ugc.ShareContent": {
  //         shareCommentary: { text: "..." },
  //         shareMediaCategory: "NONE" | "IMAGE" | "VIDEO",
  //         media: [ { status: "READY", description: { text: "..." }, media: assetUrn, title: { text: "..." } } ]
  //       }
  //     },
  //     visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  //   }
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
    cache: "no-store",
  });

  // LinkedIn returns 201 Created on success, but the response body may be
  // empty. The post URN lives in the `x-restli-id` response header.
  if (res.status === 201) {
    const externalId = res.headers.get("x-restli-id");
    if (!externalId) {
      return {
        success: false,
        error: "LinkedIn vrátil 201 Created, ale chybí hlavička x-restli-id.",
      };
    }
    console.log("[LinkedIn] ✅ publish success:", { externalId });
    return { success: true, externalId };
  }

  // Non-success path – try to parse LinkedIn's structured error.
  const errPayload = (await res.json().catch(() => ({}))) as LinkedInUgcPostResponse;
  const reason =
    errPayload.message ||
    `LinkedIn ugcPosts failed (HTTP ${res.status})`;
  console.error("[LinkedIn] publish failed:", {
    status: res.status,
    payload: errPayload,
  });
  return { success: false, error: reason };
}

// ---------------------------------------------------------------------
// Public entry point (called from publish.ts)
// ---------------------------------------------------------------------

/**
 * Public entry point used by the Next.js publish router. Takes the raw
 * `social_accounts` row for LinkedIn plus the post content / media,
 * ensures the access token is fresh, and publishes the post.
 *
 * Returns the same shape as the Instagram / Facebook / YouTube publishers
 * so the shared `handlePublishSuccess` / `handlePublishError` flow in
 * `publish.ts` can stay unchanged.
 *
 * Defense-in-depth duplicate-upload guard: if `existingExternalId` is
 * passed (the caller has already looked up `post_platforms.external_id`
 * for this post + LinkedIn account), the publish is refused. This is a
 * belt-and-suspenders measure on top of the guard in `publishPost` /
 * `publishAdditionalPlatforms` – it protects against any future caller
 * (cron, edge function, manual trigger) that bypasses the high-level
 * guard.
 */
export async function publishToLinkedInAction(params: {
  account: SocialAccountRow;
  content: string;
  mediaUrls: string[];
  location?: string | null;
  tags?: string[];
  /** If set, must be empty – the post is considered already published. */
  existingExternalId?: string | null;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { account, content, mediaUrls, location, tags, existingExternalId } = params;

  // 0) Duplicate-upload guard (belt-and-suspenders).
  if (typeof existingExternalId === "string" && existingExternalId.trim()) {
    console.warn(
      `[publishToLinkedInAction] Refusing duplicate publish – post already has LinkedIn external_id=${existingExternalId}`,
    );
    return {
      success: false,
      error: "Příspěvek je již publikován na LinkedIn (duplicate publish blocked).",
    };
  }

  // 1) LinkedIn profile must have a platform_id (= OpenID subject) – we
  //    need it to build the `author` URN.
  if (!account.platform_id) {
    return {
      success: false,
      error: "LinkedIn účet nemá uložené platform_id (OpenID subject). Připojte účet znovu.",
    };
  }

  // 2) Refresh / fetch a valid access token (covers both the on-demand
  //    "Publikovat" button and the scheduled edge function path).
  const tokenResult = await getValidLinkedInAccessToken({ account });
  if (!tokenResult.success) {
    return { success: false, error: tokenResult.error };
  }

  // 3) Build the final caption – LinkedIn supports plain text only, no
  //    separate hashtag/location fields. We embed them into the share
  //    commentary text in the same way we do for Facebook:
  //      "{content}\n\n📍 {location}\n{hashtags}"
  const finalContent = buildLinkedInContent({ content, location, tags });

  // 4) Publish via UGC Posts API.
  return publishToLinkedIn({
    accessToken: tokenResult.accessToken,
    authorUrn: `urn:li:person:${account.platform_id}`,
    content: finalContent,
    mediaUrls,
  });
}

/**
 * Build the LinkedIn post text. Same caption format as Facebook
 * (content + 📍 location + hashtags on their own lines).
 *
 * LinkedIn has a 3000-character hard limit on share commentary; we
 * truncate defensively to avoid 400 errors from the API.
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

  // LinkedIn hard limit on shareCommentary.text is 3000 characters.
  // Truncate defensively.
  const full = parts.join("\n\n");
  return full.length > 3000 ? full.slice(0, 2997) + "..." : full;
}