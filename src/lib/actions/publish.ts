"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { buildFinalCaption } from "@/lib/caption";
import { sanitizeMediaUrl } from "@/lib/utils";
import { publishToYouTubeAction } from "@/lib/actions/publish-youtube";
import { publishToLinkedInAction } from "@/lib/actions/publish-linkedin";
import { publishToTwitterAction } from "@/lib/actions/publish-twitter";
import { publishToTikTokAction } from "@/lib/actions/publish-tiktok";
import {
  isTikTokSandboxPrivateOnlyError,
  TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE,
} from "@/lib/tiktok-publish-errors";

const LOCALES = ["cs", "en", "uk"] as const;

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

type FacebookPublishResponse =
  | { id: string }
  | { error?: { message?: string } }
  | Record<string, unknown>;

type FacebookPublishMediaType = "text" | "photo" | "video";

type PostPlatformRow = {
  id?: string;
  account_id?: string | null;
  platform: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  metadata?: Record<string, unknown> | null;
  archived_at?: string | null;
  archive_reason?: string | null;
  updated_at?: string;
  created_at?: string;
};

type PublishablePostRow = {
  id: string;
  content: string | null;
  post_platforms: PostPlatformRow[] | null;
  media_urls?: string[] | null;
  location?: string | null;
  tags?: string[] | null;
};

type OAuthAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
  platform_id: string | null;
};

/** Full social_accounts row (select "*"). Superset of every per-platform cast. */
type FullSocialAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  account_name: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
  platform_id: string | null;
  publishing_type?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
};

function getPostPlatforms(post: { post_platforms?: PostPlatformRow[] | null }): PostPlatformRow[] {
  return Array.isArray(post.post_platforms) ? post.post_platforms : [];
}

function getFacebookMediaType(mediaUrls: unknown): FacebookPublishMediaType {
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

function getGraphErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

function getGraphResponseId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id : null;
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Instagram container status codes (returned by the Graph API field
 * `status_code` on `/{ig-container-id}`). See:
 * https://developers.facebook.com/docs/instagram-api/reference/ig-container
 */
type InstagramContainerStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "PUBLISHED"
  | "ERROR"
  | "EXPIRED"
  | string;

function getContainerStatusCode(payload: unknown): InstagramContainerStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const code = (payload as { status_code?: unknown }).status_code;
  return typeof code === "string" && code.trim() ? code : null;
}

/**
 * Poll the Instagram container endpoint until the video finishes processing
 * (or fails / expires). Replaces the previous hard-coded `setTimeout` which
 * was too short for MP4 uploads and caused Meta error `(#9007) Media ID is
 * not available` during `media_publish`.
 *
 * Strategy:
 *  - Poll every `pollIntervalMs` (default 2.5s).
 *  - Stop when `status_code` is `FINISHED` (ready to publish) or
 *    `PUBLISHED` (already published – shouldn't happen here).
 *  - Bail out with an error when status is `ERROR` or `EXPIRED`.
 *  - Bail out with a timeout error after `maxWaitMs` (default 120s).
 */
async function waitForInstagramContainerReady(params: {
  creationId: string;
  accessToken: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const {
    creationId,
    accessToken,
    pollIntervalMs = 2500,
    maxWaitMs = 120_000,
  } = params;

  const start = Date.now();
  let attempt = 0;

  while (true) {
    attempt += 1;
    const elapsed = Date.now() - start;

    if (elapsed > maxWaitMs) {
      return {
        success: false,
        error: `IG container ${creationId} not ready after ${Math.round(
          maxWaitMs / 1000,
        )}s.`,
      };
    }

    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      creationId,
    )}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;

    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      const apiErr = getGraphErrorMessage(payload);
      if (apiErr) {
        return { success: false, error: `IG status check failed: ${apiErr}` };
      }

      const code = getContainerStatusCode(payload);
      console.log("⏳ IG container status:", {
        creationId,
        attempt,
        elapsedMs: elapsed,
        status_code: code,
        status: (payload as { status?: unknown }).status ?? null,
      });

      if (code === "FINISHED" || code === "PUBLISHED") {
        return { success: true };
      }
      if (code === "ERROR") {
        const statusMsg =
          (payload as { status?: unknown }).status ??
          "Instagram reported an error while processing the media.";
        return {
          success: false,
          error: `IG container processing failed: ${String(statusMsg)}`,
        };
      }
      if (code === "EXPIRED") {
        return {
          success: false,
          error:
            "IG container expired before it could be published. Please try again.",
        };
      }
    } catch (e) {
      // Transient network error – log and keep polling until timeout.
      console.warn("⚠️ IG status poll network error:", {
        creationId,
        attempt,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

/**
 * Publish a post to Instagram via the two-phase IG Container process.
 * Phase 1: Create container (/{ig_user_id}/media)
 * Phase 2: Publish container (/{ig_user_id}/media_publish)
 */
async function publishToInstagram(params: {
  igUserId: string;
  accessToken: string;
  content: string;
  mediaUrls: string[];
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const { igUserId, accessToken, content, mediaUrls } = params;

  // Instagram requires at least one image or video — text-only is not allowed
  if (mediaUrls.length === 0) {
    return {
      success: false,
      error: "Instagram vyžaduje alespoň jeden obrázek nebo video.",
    };
  }

  const mediaType = getFacebookMediaType(mediaUrls);
  const baseUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}`;

  // Sanitize the media URL – strip whitespace, wrapping quotes/backticks
  // and refuse anything that is not a valid http(s) URL. Meta's video
  // endpoint is strict: a single stray backtick makes `video_url` invalid
  // and the container ends with `error_subcode: 2207082`.
  const mediaUrl = sanitizeMediaUrl(mediaUrls[0]);
  if (!mediaUrl) {
    return {
      success: false,
      error: "Neplatná URL média (po sanitizaci). Zkuste soubor nahrát znovu.",
    };
  }

  // --- Phase 1: Create Media Container ---
  console.log("Vytvářím IG kontejner...", {
    igUserId,
    mediaType,
    mediaUrl,
    "mediaUrl (JSON)": JSON.stringify(mediaUrl),
  });

  const containerBody = new URLSearchParams();
  containerBody.set("access_token", accessToken);
  containerBody.set("caption", content);

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
    cache: "no-store",
  });

  const containerPayload = (await containerRes.json().catch(async () => ({
    raw: await containerRes.text().catch(() => ""),
  }))) as FacebookPublishResponse;
  console.log("META RESPONSE (IG container):", containerPayload);

  const containerErr = getGraphErrorMessage(containerPayload);
  if (containerErr) {
    return { success: false, error: `IG container creation failed: ${containerErr}` };
  }

  const creationId = getGraphResponseId(containerPayload);
  if (!creationId) {
    return { success: false, error: "IG container creation returned no ID." };
  }

  console.log("IG kontejner vytvořen, creation_id:", creationId);

  // For images, a short static wait is enough (Instagram processes JPEGs in
  // a few seconds and the previous 3 s `setTimeout` worked reliably).
  // For videos, we MUST poll the container's `status_code` until it is
  // `FINISHED` – the previous hard-coded 10 s wait was too short and caused
  // Meta error `(#9007) Media ID is not available` on `media_publish`.
  if (mediaType === "video") {
    console.log("⏳ Čekám na zpracování IG videa (polling status_code)...");
    const ready = await waitForInstagramContainerReady({
      creationId,
      accessToken,
    });
    if (!ready.success) {
      return { success: false, error: ready.error };
    }
    console.log("✅ IG video kontejner je připraven k publikaci.");
  } else {
    await new Promise((r) => setTimeout(r, 3_000));
  }

  // --- Phase 2: Publish Container ---
  console.log("Publikuji IG kontejner...", { creationId });

  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", creationId);
  publishBody.set("access_token", accessToken);

  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
    cache: "no-store",
  });

  const publishPayload = (await publishRes.json().catch(async () => ({
    raw: await publishRes.text().catch(() => ""),
  }))) as FacebookPublishResponse;
  console.log("🔥 META RESPONSE (IG publish):", publishPayload);

  const publishErr = getGraphErrorMessage(publishPayload);
  if (publishErr) {
    return { success: false, error: `IG publish failed: ${publishErr}` };
  }

  // Instagram media_publish returns { "id": "17841405876543214" }
  // This is the actual post ID on Instagram – we MUST store it for deletion.
  const publishedId = getGraphResponseId(publishPayload);

  if (publishedId) {
    console.log("🔥 IG PUBLISH SUCCESS, media_id:", publishedId);

    // Phase 3: Fetch the shortcode for the shareable URL.
    // Instagram URLs use shortcodes like /p/CxYzABCDE/, not numeric IDs.
    // We store as "shortcode|media_id" so we have both:
    //   - shortcode → for buildLiveUrl (View on Instagram button)
    //   - media_id  → for deleteFromMeta (Graph API DELETE needs it)
    const shortcode = await fetchInstagramShortcode({
      mediaId: publishedId,
      igUserId,
      accessToken,
    });

    if (shortcode) {
      console.log("🔥 IG shortcode:", shortcode);
      // Store as "shortcode|media_id" — buildLiveUrl extracts the shortcode,
      // deleteFromMeta extracts the media_id.
      return { success: true, externalId: `${shortcode}|${publishedId}` };
    }

    // Fallback: store just the numeric ID if shortcode fetch failed.
    // buildLiveUrl and deleteFromMeta have fallbacks for this case.
    console.warn("⚠️ IG shortcode fetch failed – storing media_id only:", publishedId);
    return { success: true, externalId: publishedId };
  }

  // Fallback: if media_publish returned OK but no 'id', use creation_id.
  // This can happen with certain Meta API versions. creation_id is still usable
  // for deletion via Graph API.
  console.warn("⚠️ IG publish returned no 'id' – falling back to creation_id:", creationId);
  return { success: true, externalId: creationId };
}

/**
 * Fetch the Instagram shortcode from the Graph API after publishing.
 *
 * Instagram shortcodes are NOT derivable from the media ID — they are
 * independent identifiers assigned by Instagram. The ONLY reliable way
 * to get one is via the Graph API.
 *
 * Strategy: Query the IG user's recent media feed and find our post by
 * matching its media_id, then extract the permalink which contains the
 * shortcode (e.g. https://www.instagram.com/p/DaI93LjicoF/).
 *
 * GET /{ig-user-id}/media?user_id={ig-user-id}&fields=id,permalink&limit=5
 */
async function fetchInstagramShortcode(params: {
  mediaId: string;
  igUserId: string;
  accessToken: string;
}): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(params.igUserId)}/media?user_id=${encodeURIComponent(params.igUserId)}&fields=id,permalink&limit=5&access_token=${encodeURIComponent(params.accessToken)}`;
    const res = await fetch(url, { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    const errMsg = getGraphErrorMessage(payload);
    if (errMsg) {
      console.warn("[IG shortcode] Graph API error fetching user media:", errMsg);
      return null;
    }

    const data = (payload as Record<string, unknown>).data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(data)) {
      console.warn("[IG shortcode] No data array in response");
      return null;
    }

    // Find the post matching our media_id
    const match = data.find(
      (item: Record<string, unknown>) => String(item.id) === params.mediaId
    );

    if (match?.permalink) {
      const permalink = String(match.permalink);
      const extracted = extractShortcodeFromPermalink(permalink);
      if (extracted) {
        console.log("[IG shortcode] Found in user media feed:", extracted, "from", permalink);
        return extracted;
      }
    }

    console.warn("[IG shortcode] Post not found in recent media or no permalink");
    return null;
  } catch (err) {
    console.error("[IG shortcode] Network error:", err);
    return null;
  }
}

/**
 * Extract the shortcode from an Instagram permalink URL.
 * e.g. "https://www.instagram.com/p/DaI93LjicoF/" → "DaI93LjicoF"
 *      "https://www.instagram.com/reel/DaI93LjicoF/" → "DaI93LjicoF"
 */
function extractShortcodeFromPermalink(permalink: string): string | null {
  const match = permalink.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[2] ?? null;
}

/**
 * Resolve an Instagram shortcode back to the numeric media ID.
 * Needed for deletion — the Graph API DELETE endpoint requires the media ID,
 * but we store the shortcode as external_id for URL building.
 *
 * Uses the Graph API FQL-style lookup: GET /?id=instagram://p/{shortcode}
 */
async function resolveInstagramMediaId(params: {
  shortcode: string;
  accessToken: string;
}): Promise<string | null> {
  try {
    const igId = `instagram://p/${params.shortcode}`;
    const url = `https://graph.facebook.com/v20.0/?id=${encodeURIComponent(igId)}&access_token=${encodeURIComponent(params.accessToken)}`;
    const res = await fetch(url, { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    const data = (payload as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (!data || Object.keys(data).length === 0) {
      console.warn("[IG resolve] No data returned for shortcode:", params.shortcode);
      return null;
    }
    // Response format: { data: { "<media-id>": { ... } } }
    const mediaId = Object.keys(data)[0];
    console.log("[IG resolve] Resolved shortcode → media_id:", mediaId);
    return mediaId ?? null;
  } catch (err) {
    console.error("[IG resolve] Network error:", err);
    return null;
  }
}

/**
 * Main publish router: looks up the post's platforms and routes to the correct publisher.
 * Supports: facebook, instagram, youtube
 */
export async function publishPost(input: { postId: string }): Promise<{
  success: boolean;
  data?: { externalId?: string; platform?: string; warningCode?: string };
  errorCode?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_platforms(*), media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const typedPost = post as PublishablePostRow;
  const postPlatforms = getPostPlatforms(typedPost);

  // Prompt 027 – Krok 4: a post may have MANY post_platforms rows, one per
  // selected social account (e.g. two Facebook Pages, or FB + IG + LinkedIn).
  // Publish to EVERY pending account, not just the first row. Each row is
  // routed to its own publisher using its `account_id`, so the exact linked
  // Page/Channel is targeted and the publish count matches the selected
  // account count.
  const pendingRows = postPlatforms.filter(
    (r) => r.status !== "published" && r.status !== "publishing",
  );

  // Everything already live (or in flight) – nothing to do.
  if (pendingRows.length === 0) {
    return { success: true, data: { platform: undefined } };
  }

  const rawContent = String(post.content ?? "");
  const rawUrls = ((post as { media_urls?: unknown }).media_urls as string[] | undefined) ?? [];
  const rawLocation = (post as { location?: string | null }).location ?? null;
  const rawTags = (Array.isArray((post as { tags?: unknown }).tags) ? (post as { tags?: string[] }).tags : []) ?? [];

  // Build final caption: content + location + hashtags
  const finalCaption = buildFinalCaption({
    content: rawContent,
    location: rawLocation,
    tags: rawTags,
  });

  type SingleResult = {
    success: boolean;
    data?: { externalId?: string; platform?: string; warningCode?: string };
    errorCode?: string;
    error?: string;
  };

  /**
   * Publish ONE post_platforms row to its exact target account.
   * `row.account_id` selects the precise linked Page/Channel so a post with
   * two Facebook Pages reaches both, not just one.
   */
  // Capture the (already null-checked) ids as non-null consts. Inside the
  // async closure below, TS would otherwise widen `user`/`post` back to
  // their nullable declared types.
  const userId = user.id;
  const postId = post.id;

  async function publishTargetRow(row: PostPlatformRow): Promise<SingleResult> {
    const targetPlatform = row.platform;
    const targetAccountId = row.account_id ?? null;

  // CRITICAL – Guard against duplicate uploads, scoped to THIS account.
  // The old guard only checked `platform`, which wrongly blocked a 2nd
  // account of the same platform. We now scope to `account_id` and treat an
  // already-published row as a no-op (success) rather than an error, so a
  // multi-account post never aborts just because one of its rows is done.
  const alreadyPublishedRow = postPlatforms.find(
    (platformRow) =>
      platformRow.platform === targetPlatform &&
      platformRow.account_id === targetAccountId &&
      platformRow.status === "published" &&
      typeof platformRow.external_id === "string" &&
      platformRow.external_id.trim(),
  );
  if (alreadyPublishedRow) {
    return {
      success: true,
      data: {
        externalId: alreadyPublishedRow.external_id ?? undefined,
        platform: targetPlatform,
      },
    };
  }

  // --- Instagram ---
  if (targetPlatform === "instagram") {
    // Krok 4: target the exact Instagram account via its account_id. The
    // legacy fallback to a Facebook row's `instagram_id` metadata is gone –
    // the editor now selects concrete IG accounts that carry their own
    // platform_id + access_token.
    const igAccount = await resolveTargetAccount(supabaseAdmin, userId, "instagram", targetAccountId);

    if (!igAccount?.access_token || !igAccount?.platform_id) {
      return {
        success: false,
        error: "Chybí propojený Instagram účet (platform_id / access_token).",
      };
    }

    const result = await publishToInstagram({
      igUserId: igAccount.platform_id,
      accessToken: igAccount.access_token,
      content: finalCaption,
      mediaUrls: rawUrls,
    });

    if (!result.success) {
      await handlePublishError(supabase, userId, postId, result.error ?? "Instagram publish failed", "instagram", targetAccountId);
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(supabase, userId, postId, result.externalId ?? "", "instagram", targetAccountId);
    return { success: true, data: { externalId: result.externalId, platform: "instagram" } };
  }

  // --- YouTube ---
  // YouTube requires video (not photo). The publisher helper handles:
  //   1) refresh-token logic when the stored access_token expired
  //      (Google access tokens live for ~1 hour),
  //   2) the resumable upload protocol to YouTube Data API v3,
  //   3) writing the returned video ID back via handlePublishSuccess.
  if (targetPlatform === "youtube") {
    const ytAccount = await resolveTargetAccount(supabaseAdmin, userId, "youtube", targetAccountId);

    if (!ytAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený YouTube kanál (access_token).",
      };
    }

    // Pass any previously stored YouTube video ID so the publisher can
    // refuse a duplicate upload (belt-and-suspenders on top of the
    // alreadyPublishedRow guard above).
    const existingYtExternalId = null;

    const result = await publishToYouTubeAction({
      account: ytAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingYtExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        userId,
        postId,
        result.error ?? "YouTube publish failed",
        "youtube",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      userId,
      postId,
      result.externalId ?? "",
      "youtube",
      targetAccountId,
    );
    return {
      success: true,
      data: { externalId: result.externalId, platform: "youtube" },
    };
  }

  // --- LinkedIn ---
  // LinkedIn UGC Posts API. Supports:
  //   - text-only posts
  //   - single-image posts (first image attachment)
  //   - NOTE: video posts are NOT supported in this version (would need a
  //     separate /v2/videos upload flow with asset recipe
  //     urn:li:digitalmediaRecipe:feedshare-video).
  // The publisher helper handles:
  //   1) refresh-token logic when the stored access_token expired
  //      (LinkedIn access tokens live for 60 days),
  //   2) text vs image path selection,
  //   3) LinkedIn asset registration + binary upload for image posts,
  //   4) building the ugcPosts payload with the correct author URN
  //      (`urn:li:person:{openIdSub}`) and writing the post URN back via
  //      handlePublishSuccess.
  if (targetPlatform === "linkedin") {
    const liAccount = await resolveTargetAccount(supabaseAdmin, userId, "linkedin", targetAccountId);

    if (!liAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený LinkedIn účet (access_token).",
      };
    }

    // Pass any previously stored LinkedIn post URN so the publisher can
    // refuse a duplicate publish (belt-and-suspenders on top of the
    // alreadyPublishedRow guard above).
    const existingLiExternalId = null;

    const result = await publishToLinkedInAction({
      account: liAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingLiExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        userId,
        postId,
        result.error ?? "LinkedIn publish failed",
        "linkedin",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      userId,
      postId,
      result.externalId ?? "",
      "linkedin",
      targetAccountId,
    );
    return {
      success: true,
      data: { externalId: result.externalId, platform: "linkedin" },
    };
  }

  // --- TikTok ---
  if (targetPlatform === "tiktok") {
    const ttAccount = await resolveTargetAccount(supabaseAdmin, userId, "tiktok", targetAccountId);

    if (!ttAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený TikTok účet (access_token).",
      };
    }

    const existingTtExternalId = null;

    const result = await publishToTikTokAction({
      account: ttAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      existingExternalId: existingTtExternalId,
      platformMetadata: row.metadata ?? null,
    });

    if (!result.success) {
      const errorCode =
        ("errorCode" in result && typeof result.errorCode === "string"
          ? result.errorCode
          : undefined) ??
        (isTikTokSandboxPrivateOnlyError(result.error)
          ? TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE
          : undefined);

      await handlePublishError(
        supabase,
        userId,
        postId,
        result.error ?? "TikTok publish failed",
        "tiktok",
        targetAccountId,
      );
      return { success: false, error: result.error, errorCode };
    }

    const tiktokExternalId =
      "externalId" in result && typeof result.externalId === "string"
        ? result.externalId
        : "";

    await handlePublishSuccess(
      supabase,
      userId,
      postId,
      tiktokExternalId,
      "tiktok",
      targetAccountId,
    );
    return {
      success: true,
      data: {
        externalId: tiktokExternalId || undefined,
        platform: "tiktok",
        warningCode: "warningCode" in result ? result.warningCode : undefined,
      },
    };
  }

  // --- Twitter (X) ---
  // X API v2 for tweets + Media Upload API v1.1 for images.
  // Flow:
  //   1) Upload each image via Media Upload v1.1 → collect media_ids
  //   2) Create tweet via API v2 with media_ids attached
  //   3) Store tweet ID as external_id
  if (targetPlatform === "twitter") {
    const twAccount = await resolveTargetAccount(supabaseAdmin, userId, "twitter", targetAccountId);

    // Hybridní X režim (Prompt 031-X-COMBO, Krok 1): manuální X účet nemá
    // access_token, takže by níže padl na validaci. Místo volání X API ho
    // rovnou označíme k ručnímu vyřízení (status 'ready') a vrátíme success.
    if (twAccount?.publishing_type === "manual") {
      await handleManualReady(supabase, userId, postId, "twitter", targetAccountId);
      return { success: true, data: { platform: "twitter" } };
    }

    if (!twAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený X (Twitter) účet (access_token).",
      };
    }

    // KROK 4 (Prompt 043): Check twitter_auto_credits before calling X API.
    // Each automatic post consumes 1 credit. Users on Creator/Pro plans
    // get credits; Free users must use manual mode.
    const { data: creditRow } = await supabaseAdmin
      .from("users")
      .select("twitter_auto_credits")
      .eq("id", userId)
      .single();
    const availableCredits = (creditRow as { twitter_auto_credits?: number } | null)
      ?.twitter_auto_credits ?? 0;

    if (availableCredits <= 0) {
      const noCreditsError =
        "Nemáš dostatek X kreditů pro automatické odesílání. " +
        "Použij manuální režim (zdarma) nebo si vylepši plán na Creator/Pro.";
      await handlePublishError(
        supabase,
        userId,
        postId,
        noCreditsError,
        "twitter",
        targetAccountId,
      );
      return { success: false, error: noCreditsError };
    }

    const existingTwExternalId = null;

    const result = await publishToTwitterAction({
      account: twAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingTwExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        userId,
        postId,
        result.error ?? "Twitter publish failed",
        "twitter",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      userId,
      postId,
      result.externalId ?? "",
      "twitter",
      targetAccountId,
    );

    // KROK 4 (Prompt 043): Decrement twitter_auto_credits on success.
    // Best-effort – failure does NOT revert the published tweet.
    await supabaseAdmin
      .from("users")
      .update({ twitter_auto_credits: availableCredits - 1 })
      .eq("id", userId);

    return {
      success: true,
      data: { externalId: result.externalId, platform: "twitter" },
    };
  }

  // --- Facebook (default) ---
  const fbAccount = await resolveTargetAccount(supabaseAdmin, userId, "facebook", targetAccountId);

  if (!fbAccount?.access_token || !fbAccount?.platform_id) {
    return {
      success: false,
      error: "Chybí propojený Facebook účet (platform_id / access_token).",
    };
  }

  const mediaType = getFacebookMediaType(rawUrls);
  const photoUrls = mediaType === "photo" ? rawUrls.filter((u) => typeof u === "string" && u.trim()) : [];
  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(fbAccount.platform_id)}`;

  let facebookPostId: string | null = null;

  try {
    if (mediaType === "video") {
      const mediaUrl = String(rawUrls[0] ?? "");
      const body = new URLSearchParams();
      body.set("file_url", mediaUrl);
      body.set("description", finalCaption);
      body.set("access_token", fbAccount.access_token);

      console.log("ODESÍLÁM VIDEO NA FACEBOOK...", { platform_id: fbAccount.platform_id, mediaUrl });
      const res = await fetch(`${base}/videos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (video):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else if (mediaType === "photo" && photoUrls.length > 1) {
      console.log("Nahrávám galerii s počtem fotek:", photoUrls.length);
      console.log("ODESÍLÁM GALERII FOTEK NA FACEBOOK...", { platform_id: fbAccount.platform_id, count: photoUrls.length });

      const mediaIds: string[] = [];
      for (let i = 0; i < photoUrls.length; i++) {
        const uploadBody = new URLSearchParams();
        uploadBody.set("url", photoUrls[i]);
        uploadBody.set("published", "false");
        uploadBody.set("access_token", fbAccount.access_token);

        const uploadRes = await fetch(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: uploadBody,
          cache: "no-store",
        });

        const uploadPayload = (await uploadRes.json().catch(async () => ({ raw: await uploadRes.text().catch(() => "") }))) as FacebookPublishResponse;
        console.log(`META UPLOAD photo ${i + 1}:`, uploadPayload);

        const uploadErr = getGraphErrorMessage(uploadPayload);
        if (uploadErr) throw new Error(`Upload photo ${i + 1} failed: ${uploadErr}`);

        const photoId = getGraphResponseId(uploadPayload);
        if (!photoId) throw new Error(`Upload photo ${i + 1} returned no ID.`);
        mediaIds.push(photoId);
      }

      const feedBody = new URLSearchParams();
      feedBody.set("message", finalCaption);
      feedBody.set("attached_media", JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))));
      feedBody.set("access_token", fbAccount.access_token);

      console.log("PUBLIKUJI GALERII...", { mediaIds });
      const feedRes = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: feedBody,
        cache: "no-store",
      });

      const feedPayload = (await feedRes.json().catch(async () => ({ raw: await feedRes.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (gallery feed):", feedPayload);

      const feedErr = getGraphErrorMessage(feedPayload);
      if (feedErr) throw new Error(feedErr);
      facebookPostId = getGraphResponseId(feedPayload);

    } else if (mediaType === "photo" && photoUrls.length === 1) {
      const body = new URLSearchParams();
      body.set("url", photoUrls[0]);
      body.set("caption", finalCaption);
      body.set("access_token", fbAccount.access_token);

      console.log("ODESÍLÁM FOTO NA FACEBOOK...", { platform_id: fbAccount.platform_id, mediaUrl: photoUrls[0] });
      const res = await fetch(`${base}/photos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (photo):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else {
      const body = new URLSearchParams();
      body.set("message", finalCaption);
      body.set("access_token", fbAccount.access_token);

      console.log("ODESÍLÁM TEXT NA FACEBOOK...", { platform_id: fbAccount.platform_id });
      const res = await fetch(`${base}/feed`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;
      console.log("META RESPONSE (text):", payload);

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);
    }

    if (!facebookPostId) {
      throw new Error("Meta Graph API returned no post ID.");
    }

    await handlePublishSuccess(supabase, userId, postId, facebookPostId, "facebook", targetAccountId);
    return { success: true, data: { externalId: facebookPostId, platform: "facebook" } };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error while publishing to Facebook.";
    console.error("FACEBOOK PUBLISH ERROR:", errorMessage);

    await handlePublishError(supabase, userId, postId, errorMessage, "facebook", targetAccountId);
    return { success: false, error: errorMessage };
  }
  }

  // Publish every pending account row, then aggregate the results into a
  // single response that keeps the existing UI contract
  // ({ success, data.warningCode, error, errorCode }).
  const results: SingleResult[] = [];
  for (const row of pendingRows) {
    results.push(await publishTargetRow(row));
  }

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const warningCode = succeeded.find(
    (r) => r.data?.warningCode === "tiktok_private_only",
  )?.data?.warningCode;

  return {
    success: failed.length === 0,
    data: succeeded[0]?.data
      ? {
          externalId: succeeded[0].data.externalId,
          platform: succeeded[0].data.platform,
          warningCode,
        }
      : undefined,
    // Surface every failure so the UI toast is actionable.
    error: failed.length
      ? failed.map((f) => f.error ?? "Unknown error").join(" | ")
      : undefined,
    errorCode: failed.find((f) => f.errorCode)?.errorCode,
  };
}

// Shared helpers for DB updates and revalidation

/**
 * Resolve the concrete social_accounts row used to publish a platform.
 *
 * Prompt 026 (Krok 4.2): when `accountId` is present (a post_platforms row
 * already linked to a specific account) we target that exact account —
 * this is what enables publishing to e.g. a 2nd Facebook account. Otherwise
 * we fall back to the previous "first active account for the platform"
 * behavior so legacy rows (account_id IS NULL) keep working.
 */
async function resolveTargetAccount(
  supabaseAdmin: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  platform: string,
  accountId?: string | null,
): Promise<FullSocialAccountRow | undefined> {
  if (accountId) {
    const { data } = await supabaseAdmin
      .from("social_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);
    return data?.[0] as FullSocialAccountRow | undefined;
  }

  const { data } = await supabaseAdmin
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .ilike("platform", platform)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] as FullSocialAccountRow | undefined;
}

async function handlePublishSuccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  externalId: string,
  platform: string,
  accountId?: string | null,
) {
  const publishedAt = new Date().toISOString();

  console.log(`✅ ZAPISUJI ÚSPĚCH DO DB: ${platform} pro post ${postId}`);
  console.log(`🚀 ARCHITEKTURA: Aktualizuji post_platforms ${platform} -> published`);

  let ppQuery = supabase
    .from("post_platforms")
    .update({
      status: "published",
      published_at: publishedAt,
      external_id: externalId,
      publish_error: null,
    })
    .eq("post_id", postId)
    .eq("platform", platform);
  if (accountId) ppQuery = ppQuery.eq("account_id", accountId);

  const { error: ppError } = await ppQuery;

  if (ppError) {
    console.error("handlePublishSuccess: Failed to update post_platforms:", ppError.message);
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");
}

/**
 * Hybridní X režim (Prompt 031-X-COMBO, Krok 1): manuální X účet nemá
 * access_token (uložen jako prázdný řetězec). Místo volání X API označíme
 * řádek k ručnímu vyřízení (status 'ready') a zachováme `scheduled_at`,
 * aby se příspěvek objevil v sekci „K vyřízení" na Dashboardu.
 */
async function handleManualReady(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  platform: string,
  accountId?: string | null,
) {
  console.log(`🚀 ARCHITEKTURA: Aktualizuji post_platforms ${platform} -> ready (manuální účet)`);

  let ppQuery = supabase
    .from("post_platforms")
    .update({
      status: "ready",
      // scheduled_at ponecháváme beze změny (Supabase update nuluje jen
      // explicitně předané sloupce) – čas pro ruční vyřízení zůstává.
      publish_error: null,
    })
    .eq("post_id", postId)
    .eq("platform", platform);
  if (accountId) ppQuery = ppQuery.eq("account_id", accountId);

  const { error: ppError } = await ppQuery;

  if (ppError) {
    console.error("handleManualReady: Failed to update post_platforms:", ppError.message);
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");
}

async function handlePublishError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  errorMessage: string,
  platform?: string,
  accountId?: string | null,
) {
  if (platform) {
    console.log(`🚀 ARCHITEKTURA: Aktualizuji post_platforms ${platform} -> failed`);
    let ppQuery = supabase
      .from("post_platforms")
      .update({
        status: "failed",
        publish_error: errorMessage,
      })
      .eq("post_id", postId)
      .eq("platform", platform);
    if (accountId) ppQuery = ppQuery.eq("account_id", accountId);

    const { error: ppError } = await ppQuery;

    if (ppError) {
      console.error("handlePublishError: Failed to update post_platforms:", ppError.message);
    }
  }

  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");
}

/**
 * Backward-compatible alias — keeps existing imports working.
 * Routes to publishPost internally.
 */
export async function publishToFacebook(input: { postId: string }): Promise<{
  success: boolean;
  data?: { facebookPostId?: string };
  error?: string;
}> {
  const result = await publishPost(input);
  if (result.success && result.data) {
    return { success: true, data: { facebookPostId: result.data.externalId } };
  }
  return result as { success: boolean; data?: { facebookPostId?: string }; error?: string };
}

/**
 * Remote Edit: update a published post on Meta platforms (Facebook / Instagram).
 * Sends the new caption/message to the Graph API and updates the DB.
 * - Facebook: POST /{external_id} with { message, access_token }
 * - Instagram: POST /{external_id} with { caption, access_token }
 */
export async function updateRemotePostAction(input: {
  postId: string;
  newContent: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();

  // Fetch the post with external_ids, platforms, and published_platforms
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const postPlatforms = getPostPlatforms(post as { post_platforms?: PostPlatformRow[] | null });
  const publishedPlatforms = postPlatforms.filter((platformRow) => platformRow.status === "published");
  if (publishedPlatforms.length === 0) {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }
  const publishedPlatformNames = publishedPlatforms.map((platformRow) => platformRow.platform);

  // Platforms that support remote text editing
  const editablePlatforms = ["facebook", "youtube"];

  // Find the first platform that is both published and supports editing
  const targetPlatform = publishedPlatformNames.find((p: string) => editablePlatforms.includes(p))
    ?? publishedPlatformNames[0]
    ?? "facebook";

  const targetPlatformData = publishedPlatforms.find(
    (platformRow) => platformRow.platform === targetPlatform,
  );
  const externalId = targetPlatformData?.external_id ?? null;

  if (!externalId) {
    return { success: false, error: `Příspěvek nemá external_id pro platformu ${targetPlatform} – nelze editovat na sociální síti.` };
  }

  // Look up the access token for the target platform
  const { data: accounts } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .ilike("platform", targetPlatform)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!accounts?.[0]?.access_token) {
    return {
      success: false,
      error: `Chybí přístupový token pro ${targetPlatform}.`,
    };
  }

  const accessToken = accounts[0].access_token;
  const graphUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`;

  // Facebook uses 'message', Instagram uses 'caption'
  const paramName = targetPlatform === "instagram" ? "caption" : "message";

  const body = new URLSearchParams();
  body.set(paramName, input.newContent);
  body.set("access_token", accessToken);

  console.log(`Remote editing post on ${targetPlatform}:`, { externalId, paramName });

  const res = await fetch(graphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await res.json().catch(async () => ({
    raw: await res.text().catch(() => ""),
  }))) as FacebookPublishResponse;
  console.log(`META RESPONSE (remote edit ${targetPlatform}):`, payload);

  const errMsg = getGraphErrorMessage(payload);
  if (errMsg) {
    // Check for Meta Capability Error (#3) — remote editing requires App Review
    const isCapabilityError =
      errMsg.includes("capability") ||
      errMsg.includes("#3") ||
      errMsg.includes("3") ||
      String(payload).includes('"code":3') ||
      String(payload).includes('"error_code":3');

    if (isCapabilityError) {
      // Revalidate to prevent UI freeze on error
      revalidatePath("/", "layout");
      revalidateAllLocales("/calendar");
      revalidateAllLocales("/posts");
      revalidateAllLocales("/dashboard");

      return {
        success: false,
        error: "Úprava publikovaného příspěvku na Facebooku momentálně vyžaduje dodatečné schválení aplikace ze strany Meta (App Review). V tuto chvíli nelze text na dálku změnit.",
      };
    }

    // Revalidate on any error to prevent UI freeze
    revalidatePath("/", "layout");
    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return { success: false, error: `Editace na ${targetPlatform} selhala: ${errMsg}` };
  }

  // Update local DB with new content only
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      content: input.newContent.trim(),
    })
    .eq("id", input.postId)
    .eq("user_id", user.id);

  if (updateError) {
    revalidatePath("/", "layout");
    return { success: false, error: updateError.message };
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");

  return { success: true };
}

/**
 * Universal per-platform text update for published posts.
 *
 * Architecture: switch/case router – each platform gets its own case block.
 * To add a new platform:
 *   1. Add the platform name to the switch.
 *   2. Implement the API call (fetch to the platform's update endpoint).
 *   3. Return { success, externalId } or { success: false, error }.
 *   4. The shared post-update logic (DB + revalidate) runs automatically.
 *
 * Supported now: facebook
 * Planned: linkedin, youtube, twitter (X), instagram (not supported by API)
 */
export async function updateOnPlatformAction(input: {
  postId: string;
  platform: string;
  newContent: string;
}): Promise<{
  success: boolean;
  error?: string;
  errorCode?: string;
}> {
  const supabase = await createClient();

  // (a) Strict user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();

  // (b) Ownership check – post MUST belong to the authenticated user
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_platforms(*)")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const postPlatforms = getPostPlatforms(post as { post_platforms?: PostPlatformRow[] | null });
  const targetPlatformData = postPlatforms.find(
    (platformRow) => platformRow.platform === input.platform && platformRow.status === "published",
  );

  if (!targetPlatformData) {
    return {
      success: false,
      error: `Příspěvek není publikován na platformě ${input.platform}.`,
    };
  }

  const externalId = targetPlatformData.external_id;
  if (!externalId) {
    return {
      success: false,
      error: `Příspěvek nemá external_id pro platformu ${input.platform} – nelze updatovat.`,
    };
  }

  // (c) Look up access_token from social_accounts
  const { data: accounts, error: accError } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token, platform_id, account_name")
    .eq("user_id", user.id)
    .ilike("platform", input.platform)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  console.log(`[TOKEN LOOKUP] platform: ${input.platform}, user: ${user.id}`);
  console.log(`[TOKEN LOOKUP] accounts:`, JSON.stringify(accounts?.map(a => ({ platform_id: a.platform_id, account_name: a.account_name, tokenLast10: a.access_token?.slice(-10) })), null, 2));
  console.log(`[TOKEN LOOKUP] error:`, accError);

  if (!accounts?.[0]?.access_token) {
    return {
      success: false,
      error: `Chybí přístupový token pro ${input.platform}.`,
    };
  }

  const accessToken = accounts[0].access_token;
  const accountPlatformId = accounts[0].platform_id;

  // (d) Switch/case router – extend with new platforms here
  const apiResult = await (async () => {
    switch (input.platform) {
      case "facebook": {
        // Facebook Graph API: POST /{post_id} with message in body
        // external_id from post_platforms is the full post ID (e.g. "page_id_post_id")
        // If it doesn't contain an underscore, reconstruct it as "{page_id}_{external_id}"
        let resolvedExternalId = externalId;
        if (!externalId.includes("_") && accountPlatformId) {
          resolvedExternalId = `${accountPlatformId}_${externalId}`;
          console.log(`[FB UPDATE] external_id bez podtržítka, sestavuji: ${resolvedExternalId}`);
        }

        // The access_token from social_accounts IS the Page Access Token
        // (stored from /me/accounts response during OAuth callback)
        const pageAccessToken = accessToken;

        const graphUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(resolvedExternalId)}`;

        // Log exact request details before sending to Meta
        console.log(`[FB UPDATE] === Požadavek na Facebook ===`);
        console.log(`[FB UPDATE] URL: ${graphUrl}`);
        console.log(`[FB UPDATE] Method: POST`);
        console.log(`[FB UPDATE] external_id (raw): ${externalId}`);
        console.log(`[FB UPDATE] resolvedExternalId: ${resolvedExternalId}`);
        console.log(`[FB UPDATE] pageAccessToken (last 12): ${pageAccessToken.slice(-12)}`);
        console.log(`[FB UPDATE] message: ${input.newContent.slice(0, 100)}...`);

        const body = new URLSearchParams();
        body.set("message", input.newContent);
        body.set("access_token", pageAccessToken);

        console.log(`[FB UPDATE] Body (urlencoded): ${body.toString().replace(pageAccessToken, "TOKEN_REDACTED")}`);

        const res = await fetch(graphUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          cache: "no-store",
        });

        const payload = (await res.json().catch(async () => ({
          raw: await res.text().catch(() => ""),
        }))) as FacebookPublishResponse;
        console.log(`[FB UPDATE] META RESPONSE:`, payload);

        const errMsg = getGraphErrorMessage(payload);
        if (errMsg) {
          return { success: false as const, error: `Facebook update failed: ${errMsg}` };
        }

        return { success: true as const, externalId: resolvedExternalId };
      }

      case "linkedin": {
        // TODO: LinkedIn API v2 – PUT /v2/posts/{external_id}
        // Body: { "text": { "content": newContent } }
        // Header: Authorization: Bearer {accessToken}
        // LinkedIn tokens expire in 60 days – check token_expires_at before calling.
        console.warn(`LinkedIn update placeholder – platform: ${input.platform}, post: ${input.postId}`);
        return {
          success: false as const,
          error: "Úprava na LinkedIn zatím není implementována.",
        };
      }

      case "youtube": {
        // TODO: YouTube Data API v3 – videos().update({ id, part, requestBody })
        // requestBody: { snippet: { description: newContent } }
        console.warn(`YouTube update placeholder – platform: ${input.platform}, post: ${input.postId}`);
        return {
          success: false as const,
          error: "Úprava na YouTube zatím není implementována.",
        };
      }

      case "twitter":
      case "x": {
        // TODO: X/Twitter API v2 – PUT /2/tweets/{external_id}
        // Body: { "text": newContent }
        // Note: X API may require the media metadata to be preserved in the update.
        console.warn(`Twitter/X update placeholder – platform: ${input.platform}, post: ${input.postId}`);
        return {
          success: false as const,
          error: "Úprava na X (Twitter) zatím není implementována.",
        };
      }

      case "instagram": {
        // Instagram does NOT support editing captions of published posts.
        // This case should never be reached if SUPPORTED_UPDATE_PLATFORMS
        // is correctly configured on the frontend.
        return {
          success: false as const,
          error: "Instagram neumožňuje úpravu textu u publikovaných příspěvků.",
        };
      }

      default: {
        return {
          success: false as const,
          error: `Platforma ${input.platform} není pro úpravy podporována.`,
        };
      }
    }
  })();

  if (!apiResult.success) {
    // Revalidate on error to prevent UI freeze
    revalidatePath("/", "layout");
    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");
    return { success: false, error: apiResult.error };
  }

  // (d) On success: update 'updated_at' in post_platforms AND 'content' in posts
  const now = new Date().toISOString();

  await supabase
    .from("post_platforms")
    .update({
      updated_at: now,
    })
    .eq("post_id", input.postId)
    .eq("platform", input.platform);

  await supabase
    .from("posts")
    .update({
      content: input.newContent.trim(),
    })
    .eq("id", input.postId)
    .eq("user_id", user.id);

  // Revalidate
  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");

  return { success: true };
}

/**
 * Selective Delete: remove a published post from a specific platform via Meta Graph API.
 * Accepts postId and platform to enable per-platform deletion without affecting
 * other published platforms. Also removes the platform from `published_platforms`
 * via RPC `remove_published_platform`.
 *
 * Supports: facebook, instagram (via Meta Graph API).
 * LinkedIn is intentionally NOT supported here – we don't have a working
 * sync for LinkedIn (Community Management API returns 403 for our
 * Developer App), so we cannot reliably confirm that an API DELETE
 * actually took effect. Treating LinkedIn like Instagram (manual
 * deletion on the platform) keeps the UX honest: the user removes the
 * post on LinkedIn themselves, and Postio keeps showing it as
 * published (so other platforms of the same post keep syncing
 * normally).
 */
export async function deleteFromMeta(input: {
  postId: string;
  /** Platform key (legacy / fallback when no specific account is targeted). */
  platform?: string;
  /** Specific social_accounts row to delete from. Preferred over `platform`
   *  when the post is published to multiple accounts of the same platform
   *  (e.g. 2× Facebook Page) so the user can delete from just one of them. */
  accountId?: string;
}): Promise<{
  success: boolean;
  error?: string;
  /** Platform does not support API deletion (e.g. Instagram, LinkedIn).
   *  Post is NOT marked as removed_externally – it stays in
   *  `status="published"` so the user can keep working with the row
   *  and other platforms of the same post keep syncing normally. */
  cannotDeleteViaApi?: boolean;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();

  // Fetch the post with external_ids and published_platforms
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  // Central target-row resolution. Prefer a specific account when the
  // post is published to multiple accounts of the same platform (e.g.
  // 2× Facebook Page); fall back to the first published row of the
  // platform key for backward compatibility with legacy callers that
  // still pass only `platform`.
  const postPlatforms = getPostPlatforms(post as { post_platforms?: PostPlatformRow[] | null });
  const targetRow = input.accountId
    ? postPlatforms.find((r) => r.account_id === input.accountId && r.status === "published")
    : postPlatforms.find((r) => r.platform === input.platform && r.status === "published");
  const platform = targetRow?.platform ?? input.platform ?? "";

  // LinkedIn soft-archive: Postio does not call the LinkedIn UGC API
  // DELETE (it has no working sync, so we cannot reliably confirm
  // that an API DELETE actually took effect). Instead, the user is
  // told via toast to remove the post manually on LinkedIn, and
  // Postio updates the LinkedIn row to `status="archived"` so the
  // PostCard keeps showing the post with a greyed-out LinkedIn
  // icon – a visible reminder that the post was once published on
  // LinkedIn. We also clear `external_id` because (per the user's
  // manual test) the API still returns the same value even after
  // the post is gone on the platform, so keeping it would just be
  // misleading metadata.
  //
  // Returns `success: true, cannotDeleteViaApi: true` so the
  // calling dialog:
  // - treats it as "succeeded in Postio" (increments deletedCount,
  //   so the user gets a confirmation toast);
  // - knows the API was NOT called (so the "smazat ručně" toast
  //   is still shown).
  if (platform === "linkedin") {
    if (!targetRow) {
      return {
        success: false,
        cannotDeleteViaApi: true,
        error: "LinkedIn řádek nenalezen nebo již není publikovaný.",
      };
    }

    const now = new Date().toISOString();
    const { error: archiveError } = await supabase
      .from("post_platforms")
      .update({
        status: "archived",
        archived_at: now,
        archive_reason: "user_removed_manually",
        external_id: null,
        // Keep `published_at` so the user can see when the post was
        // originally published (used by some analytics / PostCard
        // date displays).
      })
      .eq("id", targetRow.id);

    if (archiveError) {
      console.error(
        `[deleteFromMeta] LinkedIn archive failed for post ${input.postId}:`,
        archiveError,
      );
      return { success: false, cannotDeleteViaApi: true, error: archiveError.message };
    }


    console.log(
      `[deleteFromMeta] LinkedIn row archived (no API DELETE) for post ${input.postId}`,
    );

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return {
      success: true,
      cannotDeleteViaApi: true,
    };
  }

  // --- TikTok soft-archive ---
  // Postio does not call the TikTok API DELETE (the API does not support
  // deleting videos programmatically on the free tier). Instead, the user
  // is told via toast to remove the post manually on TikTok, and Postio
  // archives the TikTok row so the PostCard keeps showing the post with
  // a greyed-out TikTok icon.
  if (platform === "tiktok") {
    if (!targetRow) {
      return {
        success: false,
        cannotDeleteViaApi: true,
        error: "TikTok řádek nenalezen nebo již není publikovaný.",
      };
    }

    const now = new Date().toISOString();
    const { error: archiveError } = await supabase
      .from("post_platforms")
      .update({
        status: "archived",
        archived_at: now,
        archive_reason: "user_removed_manually",
        external_id: null,
        // Keep `published_at` so analytics still work
      })
      .eq("id", targetRow.id);

    if (archiveError) {
      console.error(`[deleteFromMeta] TikTok archive failed for post ${input.postId}:`, archiveError);
      return { success: false, cannotDeleteViaApi: true, error: archiveError.message };
    }

    console.log(`[deleteFromMeta] TikTok row archived (no API DELETE) for post ${input.postId}`);

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return {
      success: true,
      cannotDeleteViaApi: true,
    };
  }

  const publishedPlatforms = postPlatforms.filter((platformRow) => platformRow.status === "published");
  if (publishedPlatforms.length === 0) {
    return { success: false, error: "Příspěvek není publikován." };
  }

  const externalId = targetRow?.external_id ?? null;

  if (!externalId) {
    console.log(`deleteFromMeta: Na platformě ${platform} není ID (externalId chybí). Přeskakujeme API volání na Meta.`);
  }

  // Verify the target platform is in published_platforms
  if (!publishedPlatforms.some((platformRow) => platformRow.platform === platform)) {
    return { success: false, error: `Příspěvek není publikován na ${platform}.` };
  }

  // At this point `targetRow` is guaranteed to be defined: we only reach
  // here when a published row was found for the resolved account/platform.
  if (!targetRow) {
    return { success: false, error: "Cílový řádek příspěvku nenalezen." };
  }

  // Account-scoped token lookup: when a specific account is targeted,
  // use that account's token directly; otherwise fall back to the
  // platform key (legacy callers that pass only `platform`).
  const tokenQuery = supabaseAdmin
    .from("social_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (input.accountId) {
    tokenQuery.eq("id", input.accountId);
  } else {
    tokenQuery.ilike("platform", platform);
  }
  const { data: accounts } = await tokenQuery
    .order("created_at", { ascending: false })
    .limit(1);

  if (!accounts?.[0]?.access_token) {
    return {
      success: false,
      error: `Chybí přístupový token pro ${platform}.`,
    };
  }

  // --- Twitter (X) deletion ---
  if (platform === "twitter") {
    if (!externalId) {
      return {
        success: false,
        error: "Chybí tweet ID pro smazání.",
      };
    }

    const accessToken = accounts[0].access_token;
    const tweetDeleteUrl = `https://api.twitter.com/2/tweets/${encodeURIComponent(externalId)}`;

    console.log(`[deleteFromMeta] Deleting tweet ${externalId} via X API v2`);

    try {
      const res = await fetch(tweetDeleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (res.ok || res.status === 200) {
        const data = (await res.json().catch(() => ({}))) as {
          data?: { deleted?: boolean };
        };
        console.log("[deleteFromMeta] ✅ Tweet deleted:", {
          externalId,
          response: data?.data,
        });
      } else {
        const errText = await res.text().catch(() => "");
        console.error(`[deleteFromMeta] X delete failed (${res.status}):`, errText.slice(0, 300));

        // If X says the tweet doesn't exist, treat as success.
        if (
          errText.toLowerCase().includes("does not exist") ||
          errText.toLowerCase().includes("not found") ||
          res.status === 404
        ) {
          console.log("[deleteFromMeta] Tweet already deleted on X – treating as success.");
          const now = new Date().toISOString();
          await supabase
            .from("post_platforms")
            .update({
              status: "removed_externally",
              removed_at: now,
              last_sync_at: now,
            })
            .eq("id", targetRow.id);

          revalidateAllLocales("/calendar");
          revalidateAllLocales("/posts");
          revalidateAllLocales("/dashboard");

          return { success: true };
        }

        return {
          success: false,
          error: `Smazání tweetu selhalo: ${errText.slice(0, 200)}`,
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[deleteFromMeta] X delete network error:", msg);
      return {
        success: false,
        error: `Síťová chyba při mazání tweetu: ${msg}`,
      };
    }

    // Mark the platform row as removed_externally after successful API delete.
    const now = new Date().toISOString();
    await supabase
      .from("post_platforms")
      .update({
        status: "removed_externally",
        removed_at: now,
        last_sync_at: now,
      })
      .eq("id", targetRow.id);

    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    revalidateAllLocales("/dashboard");

    return { success: true };
  }

  // --- Facebook / Instagram – standard Graph API path ---
  if (externalId) {
    const accessToken = accounts[0].access_token;

 // For Instagram: external_id formats:
    //   - "shortcode|media_id" (new posts) — extract media_id after the pipe
    //   - "1234567890" (old posts) — use directly as media_id
    //   - "shortcode" (edge case) — resolve via Graph API
    let deleteId = externalId;
    if (platform === "instagram") {
      const pipeIdx = externalId.indexOf("|");
      if (pipeIdx > 0) {
        // "shortcode|media_id" — use the media_id part directly
        deleteId = externalId.slice(pipeIdx + 1);
        console.log(`[IG delete] Extracted media_id from "${externalId}": ${deleteId}`);
      } else if (!/^\d+$/.test(externalId)) {
        // Plain shortcode — resolve via Graph API
        console.log(`[IG delete] external_id je shortcode (${externalId}), resolvuji na media_id...`);
        const resolvedMediaId = await resolveInstagramMediaId({
          shortcode: externalId,
          accessToken,
        });
        if (resolvedMediaId) {
          deleteId = resolvedMediaId;
          console.log(`[IG delete] Resolved shortcode → media_id: ${deleteId}`);
        } else {
          console.warn(`[IG delete] Nelze resolvovat shortcode ${externalId} na media_id. Zkousím přímo.`);
        }
      }
      // If it's all digits, use as-is (old format — already a media_id)
    }

    const graphUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(deleteId)}`;

    console.log(`>>> START MAZÁNÍ Z PLATFORMY: ${platform}`);
    console.log(`>>> POUŽITÉ ID: ${deleteId}`);
    console.log(`>>> POUŽITÝ TOKEN (last 10): ${accessToken.slice(-10)}`);

    try {
      const body = new URLSearchParams();
      body.set("access_token", accessToken);

      const res = await fetch(graphUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      });

      const resData = await res.json().catch(async () => ({
        raw: await res.text().catch(() => ""),
      }));
      console.log(`>>> META RESPONSE (${platform}):`, JSON.stringify(resData, null, 2));

      const errMsg = getGraphErrorMessage(resData);
      if (errMsg) {
        // If Meta says "Object does not exist" – the post is already gone on the platform.
        // Treat as success and remove from our DB.
        const isObjectNotFound =
          errMsg.toLowerCase().includes("object does not exist") ||
          errMsg.toLowerCase().includes("(#3) ") ||
          (String(resData).includes('"error_code":3') &&
            String(resData).toLowerCase().includes("does not exist"));

        if (isObjectNotFound) {
          console.log(`>>> Object not found on ${platform} – post already deleted on platform. Treating as success.`);
          // Mark as removed_externally since the post is already gone on the platform
          const now = new Date().toISOString();
          await supabase
            .from("post_platforms")
            .update({
              status: "removed_externally",
              removed_at: now,
              last_sync_at: now,
            })
            .eq("id", targetRow.id);

          revalidateAllLocales("/calendar");
          revalidateAllLocales("/posts");
          revalidateAllLocales("/dashboard");

          return { success: true, cannotDeleteViaApi: true };
        } else {
          console.error(`>>> CHYBA při mazání na ${platform}: ${errMsg}`);
          // API deletion not supported (e.g. Instagram) – soft-archive the row
          // so the user keeps a greyed-out icon as proof of past publication.
          // The post still exists on the platform; the user must delete it manually.
          if (platform === "instagram") {
            if (targetRow) {
              const now = new Date().toISOString();
              const { error: archiveError } = await supabase
                .from("post_platforms")
                .update({
                  status: "archived",
                  archived_at: now,
                  archive_reason: "user_removed_manually",
                  external_id: null,
                })
                .eq("id", targetRow.id);

              if (archiveError) {
                console.error(
                  `[deleteFromMeta] Instagram archive failed for post ${input.postId}:`,
                  archiveError,
                );
              }

              console.log(
                `[deleteFromMeta] Instagram row archived (no API DELETE) for post ${input.postId}`,
              );
            }

            revalidateAllLocales("/calendar");
            revalidateAllLocales("/posts");
            revalidateAllLocales("/dashboard");

            return {
              success: true,
              cannotDeleteViaApi: true,
            };
          }

          // For other platforms (Facebook, etc.) that unexpectedly fail:
          // do NOT mark as removed_externally. The post still exists on the platform.
          return { success: false, cannotDeleteViaApi: true, error: `Smazání z ${platform} přes API není podporováno. Smažte příspěvek ručně na platformě.` };
        }
      }

      // Úspěšné smazání – Graph API vrací {"success": true} pro Facebook
      // nebo {"id": "..."} pro Instagram
      console.log(`>>> Smazání z ${platform} ÚSPĚŠNÉ`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Neznámá síťová chyba.";
      console.error(`>>> VÝJIMEKA při mazání na ${platform}: ${errorMessage}`);
      // Network error – do NOT mark as removed_externally.
      // The post may still exist on the platform. Let syncPublishedPosts verify via GET.
      return { success: false, cannotDeleteViaApi: true, error: `Síťová chyba při mazání z ${platform}. Zkuste to znovu.` };
    }
  } else {
    console.log(`>>> externalId chybí pro ${platform} – přeskočíme API volání`);
    // No externalId – do NOT mark as removed_externally.
    // We cannot verify the post status without an ID.
    return { success: false, cannotDeleteViaApi: true, error: `Chybí ID pro smazání z ${platform}.` };
  }

  // Status update – only Facebook / Instagram reach this point
  // (LinkedIn short-circuits above). The platform row goes back to
  // `draft` so the user can re-publish later if needed.
  await supabase.from("post_platforms").update({
    status: "draft",
    published_at: null,
    external_id: null
  }).eq("id", targetRow.id);

  // Revalidate after successful deletion
  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");

  return { success: true };
}

/**
 * Publish an existing post to an additional platform that was not included
 * in the original publish. Appends the platform to `published_platforms`.
 */
export async function publishAdditionalPlatforms(input: {
  postId: string;
  platform: string;
  platformMetadata?: Record<string, unknown> | null;
  /** Prompt 026 (Krok 4.2): specific social_accounts row to publish to. */
  accountId?: string | null;
}): Promise<{
  success: boolean;
  data?: { externalId?: string; platform?: string; warningCode?: string };
  errorCode?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const supabaseAdmin = createAdminClient();

  // Fetch post with published_platforms
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_platforms(*), media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const postPlatforms = getPostPlatforms(post as { post_platforms?: PostPlatformRow[] | null });
  const publishedPlatformNames = postPlatforms
    .filter((platformRow) => platformRow.status === "published")
    .map((platformRow) => platformRow.platform);
  const allPlatformNames = postPlatforms.map((platformRow) => platformRow.platform);

  // CRITICAL – Guard against duplicate uploads.
  // If `post_platforms` for this post + `input.platform` is already in
  // `status="published"` with a non-empty `external_id`, the upload to
  // that platform has already happened. Re-running it would create a
  // duplicate (e.g. a second copy of the same YouTube video on the
  // channel). This is the same defense-in-depth guard we have in
  // `publishPost()`; see the comment there for the full rationale.
  // Prompt 026 (Krok 4.2): when a specific accountId is given, only treat
  // a row for THAT account as "already published". This lets the user
  // publish the same post to a 2nd account of the same platform.
  const alreadyPublishedRow = postPlatforms.find(
    (platformRow) =>
      platformRow.platform === input.platform &&
      (input.accountId ? platformRow.account_id === input.accountId : true) &&
      platformRow.status === "published" &&
      typeof platformRow.external_id === "string" &&
      platformRow.external_id.trim(),
  );
  if (alreadyPublishedRow) {
    console.warn(
      `[publishAdditionalPlatforms] Refusing duplicate upload – post ${input.postId} already on ${input.platform} with external_id=${alreadyPublishedRow.external_id}`,
    );
    return {
      success: false,
      error: `Příspěvek je již publikován na ${input.platform}. Duplicitní nahrávání je blokováno.`,
      data: {
        externalId: alreadyPublishedRow.external_id ?? undefined,
        platform: input.platform,
      },
    };
  }

  // Backward-compat: legacy check for `status="published"` rows that
  // somehow lost their `external_id` (should not happen in practice but
  // keeps existing behavior for callers that rely on the simple guard).
  if (publishedPlatformNames.includes(input.platform)) {
    return { success: false, error: `Příspěvek je již publikován na ${input.platform}.` };
  }

  // CRITICAL: If the platform does not exist in post_platforms at all,
  // create a draft entry first so handlePublishSuccess can UPDATE it.
  // Prompt 026 (Krok 4.2): also store the specific account_id so the row
  // is linked to the chosen account (enables 2+ accounts of one platform).
  if (!allPlatformNames.includes(input.platform)) {
    console.log(`⚠️ Platform ${input.platform} not in post_platforms – creating entry first`);
    await supabase
      .from("post_platforms")
      .insert({
        post_id: post.id,
        account_id: input.accountId ?? null,
        platform: input.platform,
        status: "draft",
      });
  }

  const targetPlatform = input.platform;
  const targetAccountId = input.accountId ?? null;

  const rawContent = String(post.content ?? "");
  const rawUrls = ((post as { media_urls?: unknown }).media_urls as string[] | undefined) ?? [];
  const rawLocation = (post as { location?: string | null }).location ?? null;
  const rawTags = (Array.isArray((post as { tags?: unknown }).tags) ? (post as { tags?: string[] }).tags : []) ?? [];

  const finalCaption = buildFinalCaption({
    content: rawContent,
    location: rawLocation,
    tags: rawTags,
  });

  // --- Instagram ---
  if (targetPlatform === "instagram") {
    const igAccount = await resolveTargetAccount(supabaseAdmin, user.id, "instagram", targetAccountId);
    if (!igAccount?.access_token || !igAccount?.platform_id) {
      return {
        success: false,
        error: "Chybí propojený Instagram účet.",
      };
    }

    const result = await publishToInstagram({
      igUserId: igAccount.platform_id,
      accessToken: igAccount.access_token,
      content: finalCaption,
      mediaUrls: rawUrls,
    });

    if (!result.success) {
      await handlePublishError(supabase, user.id, post.id, result.error ?? "Instagram publish failed", "instagram", targetAccountId);
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(supabase, user.id, post.id, result.externalId ?? "", "instagram", targetAccountId);
    return { success: true, data: { externalId: result.externalId, platform: "instagram" } };
  }

  // --- YouTube ---
  if (targetPlatform === "youtube") {
    const ytAccount = await resolveTargetAccount(supabaseAdmin, user.id, "youtube", targetAccountId);

    if (!ytAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený YouTube kanál (access_token).",
      };
    }

    // Pass any previously stored YouTube video ID so the publisher can
    // refuse a duplicate upload (belt-and-suspenders on top of the
    // alreadyPublishedRow guard above).
    const existingYtExternalId = null;

    const result = await publishToYouTubeAction({
      account: ytAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingYtExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        user.id,
        post.id,
        result.error ?? "YouTube publish failed",
        "youtube",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      user.id,
      post.id,
      result.externalId ?? "",
      "youtube",
      targetAccountId,
    );
    return {
      success: true,
      data: { externalId: result.externalId, platform: "youtube" },
    };
  }

  // --- LinkedIn ---
  // Same logic as the `publishPost` LinkedIn branch – see that comment
  // for the full rationale. We only differ in that
  // `publishAdditionalPlatforms` already verified the LinkedIn target
  // platform is not in `publishedPlatformNames`, so we do not need to
  // pass an `existingExternalId` guard beyond the duplicate-upload
  // check at the top of this function.
  if (targetPlatform === "linkedin") {
    const liAccount = await resolveTargetAccount(supabaseAdmin, user.id, "linkedin", targetAccountId);

    if (!liAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený LinkedIn účet.",
      };
    }

    const existingLiExternalId = null;

    const result = await publishToLinkedInAction({
      account: liAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingLiExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        user.id,
        post.id,
        result.error ?? "LinkedIn publish failed",
        "linkedin",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      user.id,
      post.id,
      result.externalId ?? "",
      "linkedin",
      targetAccountId,
    );
    return {
      success: true,
      data: { externalId: result.externalId, platform: "linkedin" },
    };
  }

  // --- TikTok ---
  if (targetPlatform === "tiktok") {
    const ttAccount = await resolveTargetAccount(supabaseAdmin, user.id, "tiktok", targetAccountId);

    if (!ttAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený TikTok účet.",
      };
    }

    const existingTtExternalId = null;

    const result = await publishToTikTokAction({
      account: ttAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      existingExternalId: existingTtExternalId,
      platformMetadata: input.platformMetadata ?? null,
    });

    if (!result.success) {
      const errorCode =
        ("errorCode" in result && typeof result.errorCode === "string"
          ? result.errorCode
          : undefined) ??
        (isTikTokSandboxPrivateOnlyError(result.error)
          ? TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE
          : undefined);

      await handlePublishError(
        supabase,
        user.id,
        post.id,
        result.error ?? "TikTok publish failed",
        "tiktok",
        targetAccountId,
      );
      return { success: false, error: result.error, errorCode };
    }

    const tiktokExternalId =
      "externalId" in result && typeof result.externalId === "string"
        ? result.externalId
        : "";

    await handlePublishSuccess(
      supabase,
      user.id,
      post.id,
      tiktokExternalId,
      "tiktok",
      targetAccountId,
    );
    return {
      success: true,
      data: {
        externalId: tiktokExternalId || undefined,
        platform: "tiktok",
        warningCode: "warningCode" in result ? result.warningCode : undefined,
      },
    };
  }

  // --- Twitter (X) ---
  if (targetPlatform === "twitter") {
    const twAccount = await resolveTargetAccount(supabaseAdmin, user.id, "twitter", targetAccountId);

    // Hybridní X režim (Prompt 031-X-COMBO, Krok 1): manuální X účet nemá
    // access_token → místo API volání označíme řádek k ručnímu vyřízení.
    if (twAccount?.publishing_type === "manual") {
      await handleManualReady(supabase, user.id, post.id, "twitter", targetAccountId);
      return { success: true, data: { platform: "twitter" } };
    }

    if (!twAccount?.access_token) {
      return {
        success: false,
        error: "Chybí propojený X (Twitter) účet.",
      };
    }

    // KROK 4 (Prompt 043): Check twitter_auto_credits before calling X API.
    const { data: creditRow } = await supabaseAdmin
      .from("users")
      .select("twitter_auto_credits")
      .eq("id", user.id)
      .single();
    const availableCredits = (creditRow as { twitter_auto_credits?: number } | null)
      ?.twitter_auto_credits ?? 0;

    if (availableCredits <= 0) {
      const noCreditsError =
        "Nemáš dostatek X kreditů pro automatické odesílání. " +
        "Použij manuální režim (zdarma) nebo si vylepši plán na Creator/Pro.";
      await handlePublishError(
        supabase,
        user.id,
        post.id,
        noCreditsError,
        "twitter",
        targetAccountId,
      );
      return { success: false, error: noCreditsError };
    }

    const existingTwExternalId = null;

    const result = await publishToTwitterAction({
      account: twAccount,
      content: rawContent,
      mediaUrls: rawUrls,
      location: rawLocation,
      tags: rawTags,
      existingExternalId: existingTwExternalId,
    });

    if (!result.success) {
      await handlePublishError(
        supabase,
        user.id,
        post.id,
        result.error ?? "Twitter publish failed",
        "twitter",
        targetAccountId,
      );
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(
      supabase,
      user.id,
      post.id,
      result.externalId ?? "",
      "twitter",
      targetAccountId,
    );

    // KROK 4 (Prompt 043): Decrement twitter_auto_credits on success.
    await supabaseAdmin
      .from("users")
      .update({ twitter_auto_credits: availableCredits - 1 })
      .eq("id", user.id);

    return {
      success: true,
      data: { externalId: result.externalId, platform: "twitter" },
    };
  }

  // --- Facebook (default) ---
  const fbAccount = await resolveTargetAccount(supabaseAdmin, user.id, "facebook", targetAccountId);

  if (!fbAccount?.access_token || !fbAccount?.platform_id) {
    return {
      success: false,
      error: "Chybí propojený Facebook účet.",
    };
  }

  const mediaType = getFacebookMediaType(rawUrls);
  const photoUrls = mediaType === "photo" ? rawUrls.filter((u) => typeof u === "string" && u.trim()) : [];
  const base = `https://graph.facebook.com/v20.0/${encodeURIComponent(fbAccount.platform_id)}`;

  let facebookPostId: string | null = null;

  try {
    if (mediaType === "video") {
      const mediaUrl = String(rawUrls[0] ?? "");
      const body = new URLSearchParams();
      body.set("file_url", mediaUrl);
      body.set("description", finalCaption);
      body.set("access_token", fbAccount.access_token);

      const res = await fetch(`${base}/videos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else if (mediaType === "photo" && photoUrls.length > 1) {
      const mediaIds: string[] = [];
      for (let i = 0; i < photoUrls.length; i++) {
        const uploadBody = new URLSearchParams();
        uploadBody.set("url", photoUrls[i]);
        uploadBody.set("published", "false");
        uploadBody.set("access_token", fbAccount.access_token);

        const uploadRes = await fetch(`${base}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: uploadBody,
          cache: "no-store",
        });

        const uploadPayload = (await uploadRes.json().catch(async () => ({ raw: await uploadRes.text().catch(() => "") }))) as FacebookPublishResponse;
        const uploadErr = getGraphErrorMessage(uploadPayload);
        if (uploadErr) throw new Error(`Upload photo ${i + 1} failed: ${uploadErr}`);

        const photoId = getGraphResponseId(uploadPayload);
        if (!photoId) throw new Error(`Upload photo ${i + 1} returned no ID.`);
        mediaIds.push(photoId);
      }

      const feedBody = new URLSearchParams();
      feedBody.set("message", finalCaption);
      feedBody.set("attached_media", JSON.stringify(mediaIds.map((id) => ({ media_fbid: id }))));
      feedBody.set("access_token", fbAccount.access_token);

      const feedRes = await fetch(`${base}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: feedBody,
        cache: "no-store",
      });

      const feedPayload = (await feedRes.json().catch(async () => ({ raw: await feedRes.text().catch(() => "") }))) as FacebookPublishResponse;
      const feedErr = getGraphErrorMessage(feedPayload);
      if (feedErr) throw new Error(feedErr);
      facebookPostId = getGraphResponseId(feedPayload);

    } else if (mediaType === "photo" && photoUrls.length === 1) {
      const body = new URLSearchParams();
      body.set("url", photoUrls[0]);
      body.set("caption", finalCaption);
      body.set("access_token", fbAccount.access_token);

      const res = await fetch(`${base}/photos`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);

    } else {
      const body = new URLSearchParams();
      body.set("message", finalCaption);
      body.set("access_token", fbAccount.access_token);

      const res = await fetch(`${base}/feed`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
      const payload = (await res.json().catch(async () => ({ raw: await res.text().catch(() => "") }))) as FacebookPublishResponse;

      const errMsg = getGraphErrorMessage(payload);
      if (errMsg) throw new Error(errMsg);
      facebookPostId = getGraphResponseId(payload);
    }

    if (!facebookPostId) {
      throw new Error("Meta Graph API returned no post ID.");
    }

    await handlePublishSuccess(supabase, user.id, post.id, facebookPostId, "facebook", targetAccountId);
    return { success: true, data: { externalId: facebookPostId, platform: "facebook" } };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error while publishing.";
    await handlePublishError(supabase, user.id, post.id, errorMessage, "facebook", targetAccountId);
    return { success: false, error: errorMessage };
  }
}

/**
 * Hybridní X režim (Prompt 031-X-COMBO, Krok 3): uživatel manuálně
 * publikoval X příspěvek a chce ho odebrat ze sekce „K vyřízení".
 * Změní `post_platforms.status` z 'ready' na 'published' a zapíše
 * `published_at = now()`. Scope dle platform / accountId jako ostatní handlery.
 */
export async function markAsPublishedManual(input: {
  postId: string;
  platform?: string;
  accountId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Ověření vlastnictví postu (RLS) před zápisem.
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const publishedAt = new Date().toISOString();

  let ppQuery = supabase
    .from("post_platforms")
    .update({
      status: "published",
      published_at: publishedAt,
      publish_error: null,
    })
    .eq("post_id", input.postId)
    .eq("status", "ready");

  if (input.platform) ppQuery = ppQuery.eq("platform", input.platform);
  if (input.accountId) ppQuery = ppQuery.eq("account_id", input.accountId);

  const { error: ppError } = await ppQuery;

  if (ppError) {
    console.error("markAsPublishedManual: Failed to update post_platforms:", ppError.message);
    return { success: false, error: ppError.message };
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");

  return { success: true };
}

