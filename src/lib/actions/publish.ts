"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { buildFinalCaption } from "@/lib/caption";

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

async function updatePostPublishState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    userId: string;
    postId: string;
    values: Record<string, unknown>;
  }
) {
  const attempt = await supabase
    .from("posts")
    .update(input.values)
    .eq("id", input.postId)
    .eq("user_id", input.userId);

  if (!attempt.error) return;

  const msg = String(attempt.error.message || "");
  if (!msg.toLowerCase().includes("publish_error")) return;

  if (!Object.prototype.hasOwnProperty.call(input.values, "publish_error")) return;
  const valuesWithoutPublishError = { ...input.values };
  delete (valuesWithoutPublishError as Record<string, unknown>).publish_error;

  await supabase
    .from("posts")
    .update(valuesWithoutPublishError)
    .eq("id", input.postId)
    .eq("user_id", input.userId);
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

  // --- Phase 1: Create Media Container ---
  console.log("Vytvářím IG kontejner...", { igUserId, mediaType, mediaUrls });

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

  // Wait for Instagram to process the media (video needs more time)
  const waitMs = mediaType === "video" ? 10_000 : 3_000;
  await new Promise((r) => setTimeout(r, waitMs));

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
 * Main publish router: looks up the post's platforms and routes to the correct publisher.
 * Supports: facebook, instagram
 */
export async function publishPost(input: { postId: string }): Promise<{
  success: boolean;
  data?: { externalId?: string; platform?: string };
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
    .select("id, content, platforms, media_urls, location, tags")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
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

  // Publish to the first platform in the list
  const targetPlatform = platforms[0] ?? "facebook";

  // --- Instagram ---
  if (targetPlatform === "instagram") {
    const { data: igAccounts } = await supabaseAdmin
      .from("social_accounts")
      .select("access_token, platform_id")
      .eq("user_id", user.id)
      .ilike("platform", "instagram")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const igAccount = igAccounts?.[0];
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
      await handlePublishError(supabase, user.id, post.id, result.error ?? "Instagram publish failed");
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(supabase, user.id, post.id, result.externalId ?? "", "instagram");
    return { success: true, data: { externalId: result.externalId, platform: "instagram" } };
  }

  // --- Facebook (default) ---
  const { data: fbAccounts } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token, platform_id")
    .eq("user_id", user.id)
    .ilike("platform", "facebook")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const fbAccount = fbAccounts?.[0];
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

    await handlePublishSuccess(supabase, user.id, post.id, facebookPostId, "facebook");
    return { success: true, data: { externalId: facebookPostId, platform: "facebook" } };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error while publishing to Facebook.";
    console.error("FACEBOOK PUBLISH ERROR:", errorMessage);

    await handlePublishError(supabase, user.id, post.id, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Shared helpers for DB updates and revalidation
async function handlePublishSuccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  externalId: string,
  platform: string
) {
  const publishedAt = new Date().toISOString();

  // Atomic append to published_platforms via PostgreSQL RPC function.
  // Pass explicit user_id because auth.uid() returns NULL in RPC context.
  const { data: rpcResult, error: rpcError } = await supabase.rpc("append_published_platform", {
    p_post_id: postId,
    p_platform: platform,
    p_user_id: userId,
  });

  if (rpcError) {
    console.error("handlePublishSuccess: RPC append_published_platform FAILED:", rpcError.message);
  } else {
    console.log("handlePublishSuccess: RPC append_published_platform OK, result:", rpcResult);
    console.log("🔥 SERVER: Úspěšně zapsána platforma do DB!");
    // IHNED po úspěchu zavolej revalidaci
    revalidatePath("/", "layout");
  }

  // Fetch fresh data from DB to verify the final state of published_platforms
  const { data: updatedPost } = await supabase
    .from("posts")
    .select("published_platforms, external_ids")
    .eq("id", postId)
    .eq("user_id", userId)
    .single();

  const currentExternalIds = (updatedPost?.external_ids as Record<string, string>) ?? {};
  const newExternalIds = { ...currentExternalIds, [platform]: externalId };

  console.log("🔥 SAVING external_ids to DB:", newExternalIds, "for post:", postId);
  console.log("AKTUALIZOVANÉ PLATFORMY V DB:", updatedPost?.published_platforms);

  // Update other fields (status, external_ids, etc.) – do NOT touch published_platforms here.
  await updatePostPublishState(supabase, {
    userId,
    postId,
    values: {
      status: "published",
      scheduled_at: null,
      published_at: publishedAt,
      external_ids: newExternalIds,
      publish_error: null,
    },
  });

  // Hard revalidate – clear all Next.js cache
  revalidatePath("/", "layout");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");
}

async function handlePublishError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  errorMessage: string
) {
  // Read current published_platforms to check if this post is already published elsewhere.
  // If so, do NOT reset status to 'failed' or clear published_at – the post is still live.
  const { data: currentPost } = await supabase
    .from("posts")
    .select("published_platforms, status")
    .eq("id", postId)
    .eq("user_id", userId)
    .single();

  const currentPlatforms = (currentPost?.published_platforms as string[] | null) ?? [];
  const isAlreadyPublished = currentPlatforms.length > 0;

  if (isAlreadyPublished) {
    // Post is already published on at least one platform – only record the error,
    // do NOT reset status or published_at
    await updatePostPublishState(supabase, {
      userId,
      postId,
      values: {
        publish_error: errorMessage,
      },
    });
  } else {
    // First publish attempt failed – mark as failed
    await updatePostPublishState(supabase, {
      userId,
      postId,
      values: {
        status: "failed",
        publish_error: errorMessage,
        published_at: null,
      },
    });
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
    .select("id, status, platforms, external_ids, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  if (post.status !== "published") {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const publishedPlatforms = Array.isArray(post.published_platforms) ? post.published_platforms : [];

  // Platforms that support remote text editing
  const editablePlatforms = ["facebook", "youtube"];

  // Find the first platform that is both published and supports editing
  const targetPlatform = publishedPlatforms.find((p) => editablePlatforms.includes(p))
    ?? platforms[0]
    ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;

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
 * Selective Delete: remove a published post from a specific platform via Meta Graph API.
 * Accepts postId and platform to enable per-platform deletion without affecting
 * other published platforms. Also removes the platform from `published_platforms`
 * via RPC `remove_published_platform`.
 *
 * Supports: facebook, instagram (via Meta Graph API)
 */
export async function deleteFromMeta(input: {
  postId: string;
  platform: string;
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

  // Fetch the post with external_ids and published_platforms
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, status, external_ids, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  if (post.status !== "published") {
    return { success: false, error: "Příspěvek není publikován." };
  }

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[input.platform]
    ? externalIds[input.platform].trim()
    : null;

  if (!externalId) {
    console.log(`deleteFromMeta: Na platformě ${input.platform} není ID (externalId chybí). Přeskakujeme API volání na Meta.`);
  }

  const publishedPlatforms = Array.isArray(post.published_platforms) ? post.published_platforms : [];

  // Verify the target platform is in published_platforms
  if (!publishedPlatforms.includes(input.platform)) {
    return { success: false, error: `Příspěvek není publikován na ${input.platform}.` };
  }

  // Look up the access token for the target platform
  const { data: accounts } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .ilike("platform", input.platform)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!accounts?.[0]?.access_token) {
    return {
      success: false,
      error: `Chybí přístupový token pro ${input.platform}.`,
    };
  }

  if (externalId) {
    const accessToken = accounts[0].access_token;
    const graphUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`;

    console.log(`>>> START MAZÁNÍ Z PLATFORMY: ${input.platform}`);
    console.log(`>>> POUŽITÉ ID: ${externalId}`);
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
      console.log(`>>> META RESPONSE (${input.platform}):`, JSON.stringify(resData, null, 2));

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
          console.log(`>>> Object not found on ${input.platform} – post already deleted on platform. Treating as success.`);
        } else {
          console.error(`>>> CHYBA při mazání na ${input.platform}: ${errMsg}`);
          // NEMAZAT z DB – příspěvek stále existuje na síti!
          return { success: false, error: `Smazání z ${input.platform} selhalo na síti: ${errMsg}` };
        }
      }

      // Úspěšné smazání – Graph API vrací {"success": true} pro Facebook
      // nebo {"id": "..."} pro Instagram
      console.log(`>>> Smazání z ${input.platform} ÚSPĚŠNÉ`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Neznámá síťová chyba.";
      console.error(`>>> VÝJIMEKA při mazání na ${input.platform}: ${errorMessage}`);
      return { success: false, error: `Síťová chyba při mazání z ${input.platform}: ${errorMessage}` };
    }
  } else {
    console.log(`>>> externalId chybí pro ${input.platform} – přeskočíme API volání`);
  }

  // Remove platform from published_platforms via RPC (s explicitním user_id)
  const { error: rpcError } = await supabase.rpc("remove_published_platform", {
    p_post_id: input.postId,
    p_platform: input.platform,
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error("deleteFromMeta: RPC remove_published_platform FAILED:", rpcError.message);
    return { success: false, error: `Chyba při aktualizaci DB: ${rpcError.message}` };
  }

  console.log(`deleteFromMeta: Platforma ${input.platform} odstraněna z published_platforms`);

  // If this was the last published platform, update status back to 'draft'
  const remainingPlatforms = publishedPlatforms.filter((p) => p !== input.platform);
  
  // Update external_ids locally by removing the key
  const updatedExternalIds = { ...externalIds };
  delete updatedExternalIds[input.platform];
  
  if (remainingPlatforms.length === 0) {
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: input.postId,
      values: {
        status: "draft",
        published_at: null,
        external_ids: updatedExternalIds,
      },
    });
  } else {
    // Just update external_ids without changing status
    await updatePostPublishState(supabase, {
      userId: user.id,
      postId: input.postId,
      values: {
        external_ids: updatedExternalIds,
      },
    });
  }

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
}): Promise<{
  success: boolean;
  data?: { externalId?: string; platform?: string };
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
    .select("id, content, platforms, media_urls, location, tags, published_platforms")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  const publishedPlatforms = (post.published_platforms as string[] | null) ?? [];

  // Already published to this platform
  if (publishedPlatforms.includes(input.platform)) {
    return { success: false, error: `Příspěvek je již publikován na ${input.platform}.` };
  }

  const targetPlatform = input.platform;
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
    const { data: igAccounts } = await supabaseAdmin
      .from("social_accounts")
      .select("access_token, platform_id")
      .eq("user_id", user.id)
      .ilike("platform", "instagram")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const igAccount = igAccounts?.[0];
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
      await handlePublishError(supabase, user.id, post.id, result.error ?? "Instagram publish failed");
      return { success: false, error: result.error };
    }

    await handlePublishSuccess(supabase, user.id, post.id, result.externalId ?? "", "instagram");
    return { success: true, data: { externalId: result.externalId, platform: "instagram" } };
  }

  // --- Facebook (default) ---
  const { data: fbAccounts } = await supabaseAdmin
    .from("social_accounts")
    .select("access_token, platform_id")
    .eq("user_id", user.id)
    .ilike("platform", "facebook")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const fbAccount = fbAccounts?.[0];
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

    await handlePublishSuccess(supabase, user.id, post.id, facebookPostId, "facebook");
    return { success: true, data: { externalId: facebookPostId, platform: "facebook" } };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error while publishing.";
    await handlePublishError(supabase, user.id, post.id, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * @deprecated Use updateRemotePostAction for text-only remote edits.
 * Full update (content + location + tags) on Meta platforms.
 */
export async function updatePublishedPost(input: {
  postId: string;
  content: string;
  location?: string;
  tags?: string[];
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

  // Fetch the post with all needed fields
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, status, platforms, external_ids")
    .eq("id", input.postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found" };
  }

  if (post.status !== "published") {
    return { success: false, error: "Pouze publikované příspěvky lze editovat na sociální síti." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const targetPlatform = platforms[0] ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;

  if (!externalId) {
    return { success: false, error: "Příspěvek nemá external_id pro tuto platformu – nelze editovat na sociální síti." };
  }

  // Build the final caption
  const finalCaption = buildFinalCaption({
    content: input.content,
    location: input.location,
    tags: input.tags,
  });

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

  // Instagram uses 'caption', Facebook uses 'message'
  const paramName = targetPlatform === "instagram" ? "caption" : "message";

  const body = new URLSearchParams();
  body.set(paramName, finalCaption);
  body.set("access_token", accessToken);

  console.log(`Updating published post on ${targetPlatform}:`, { externalId, paramName, caption: finalCaption });

  const res = await fetch(graphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await res.json().catch(async () => ({
    raw: await res.text().catch(() => ""),
  }))) as FacebookPublishResponse;
  console.log(`META RESPONSE (update ${targetPlatform}):`, payload);

  const errMsg = getGraphErrorMessage(payload);
  if (errMsg) {
    return { success: false, error: `Editace na ${targetPlatform} selhala: ${errMsg}` };
  }

  // Update local DB with new content, location, tags
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      content: input.content.trim(),
      location: input.location?.trim() || null,
      tags: input.tags ?? [],
    })
    .eq("id", input.postId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  revalidateAllLocales("/dashboard");

  return { success: true };
}
