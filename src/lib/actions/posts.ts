"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { setPostTags } from "@/lib/actions/tag-actions";
import {
  checkYouTubeVideoExists,
  getValidYouTubeAccessToken,
} from "@/lib/actions/publish-youtube";
import { getValidLinkedInAccessToken } from "@/lib/actions/publish-linkedin";

const LOCALES = ["cs", "en", "uk"];

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

export async function createPostAction(inputData: {
  content: string;
  platforms: string[];
  scheduledAt?: string | null;
  status: "draft" | "scheduled" | "published";
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
  tagIds?: string[];
  published_platforms?: string[];
  published_at?: string | null;
  external_ids?: Record<string, string> | null;
}) {
  // OCHRANA DAT: published_platforms nesmí být nikdy přepsáno z formuláře
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { published_platforms, published_at, external_ids, ...cleanData } = inputData;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a post." };
  }

  if (cleanData.status === "scheduled") {
    if (!cleanData.scheduledAt) {
      console.log("SCHEDULE ERROR: Chybí scheduledAt");
      return { success: false, error: "Pro naplánování vyber datum a čas publikování." };
    }
    const scheduled = new Date(cleanData.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      console.log("SCHEDULE ERROR: Neplatné datum:", cleanData.scheduledAt);
      return { success: false, error: "Neplatné datum naplánování." };
    }
    if (scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
      console.log("SCHEDULE ERROR: Čas je v minulosti (>5 min):", cleanData.scheduledAt, "now:", new Date().toISOString());
      return { success: false, error: "Naplánovaný čas musí být v budoucnosti." };
    }
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: cleanData.content,
      media_urls: cleanData.mediaUrls ?? [],
      location: cleanData.location ?? null,
      tags: cleanData.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return { success: false, error: error.message };
  }

  // --- DUAL WRITE: Sync platforms to post_platforms ---
  if (post && cleanData.platforms.length > 0) {
    console.log("🔥 DUAL-WRITE START: vytvářím instance pro", cleanData.platforms);
    const platformRows = cleanData.platforms.map(p => ({
      post_id: post.id,
      platform: p,
      status: cleanData.status === 'scheduled' ? 'scheduled' : 'draft',
      scheduled_at: cleanData.scheduledAt
    }));

    const { error: ppError } = await supabase.from('post_platforms').insert(platformRows);

    if (ppError) {
      console.error("❌ DUAL-WRITE ERROR:", ppError.message);
    } else {
      console.log("✅ DUAL-WRITE SUCCESS: instance zapsány.");
    }
  }

  // --- SET POST TAGS (interní organizační štítky z tabulky tags) ---
  if (post && cleanData.tagIds !== undefined) {
    const tagResult = await setPostTags(post.id, cleanData.tagIds);
    if (!tagResult.success) {
      console.error("❌ POST TAGS ERROR:", tagResult.error);
    } else {
      console.log("✅ POST TAGS: nastaveno", cleanData.tagIds.length, "štítků");
    }
  }

  if (cleanData.status === "scheduled") {
    console.log("PŘÍSPĚVEK NAPLÁNOVÁN:", post.id, "status:", cleanData.status, "scheduled_at:", cleanData.scheduledAt);
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, data: post };
}

export async function updatePost(id: string, inputData: {
  content?: string;
  platforms?: string[];
  scheduledAt?: string | null;
  status?: "draft" | "scheduled" | "publishing" | "published" | "failed" | "removed_externally";
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
  tagIds?: string[];
  published_platforms?: string[];
  published_at?: string | null;
  external_ids?: Record<string, string> | null;
}) {
  // STRICT SEPARATION: published_platforms, published_at, external_ids are NEVER modified via updatePost.
  // These fields are ONLY managed by publish logic via RPC (append_published_platform / remove_published_platform).
  // Status is restricted to draft/scheduled only – publishing/published/failed are managed by publish flow.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { published_platforms, published_at, external_ids, status: inputStatus, ...cleanData } = inputData;
  const safeStatus = (inputStatus === "draft" || inputStatus === "scheduled") ? inputStatus : undefined;

  const supabase = await createClient();

  if (safeStatus === "scheduled") {
    if (cleanData.scheduledAt === null) {
      return { success: false, error: "Pro naplánování vyber datum a čas publikování." };
    }
    if (typeof cleanData.scheduledAt === "string") {
      const scheduled = new Date(cleanData.scheduledAt);
      if (Number.isNaN(scheduled.getTime())) {
        return { success: false, error: "Neplatné datum naplánování." };
      }
      if (scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
        return { success: false, error: "Naplánovaný čas musí být v budoucnosti." };
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (cleanData.content !== undefined) updateData.content = cleanData.content;
  
  if (cleanData.mediaUrls !== undefined) updateData.media_urls = cleanData.mediaUrls;
  if (cleanData.location !== undefined) updateData.location = cleanData.location;
  if (cleanData.tags !== undefined) updateData.tags = cleanData.tags;

  // CRITICAL: published_platforms is NEVER allowed through updatePost.
  // This field is ONLY modified by publish logic via RPC (append_published_platform).
  delete (updateData as Record<string, unknown>).published_platforms;

  const { data: post, error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating post:", error);
    return { success: false, error: error.message };
  }

  // --- DUAL WRITE: Sync platforms to post_platforms ---
  if (post && cleanData.platforms !== undefined) {
    const { data: existingInstances } = await supabase
      .from("post_platforms")
      .select("platform, status")
      .eq("post_id", id);

    const existingPlatforms = (existingInstances || []).map((i) => i.platform);
    const newPlatforms = cleanData.platforms;

    const toAdd = newPlatforms.filter((p) => !existingPlatforms.includes(p));
    if (toAdd.length > 0) {
      await supabase.from("post_platforms").insert(
        toAdd.map((p) => ({
          post_id: id,
          platform: p,
          status: safeStatus === "scheduled" ? "scheduled" : "draft",
          scheduled_at: safeStatus === "scheduled" ? (cleanData.scheduledAt ?? post.scheduled_at) : null,
        }))
      );
    }

    const toRemove = existingPlatforms.filter((p) => !newPlatforms.includes(p));
    if (toRemove.length > 0) {
      const safeToRemove = (existingInstances || [])
        .filter(
          (i) =>
            toRemove.includes(i.platform) &&
            i.status !== "published" &&
            i.status !== "publishing"
        )
        .map((i) => i.platform);

      if (safeToRemove.length > 0) {
        await supabase
          .from("post_platforms")
          .delete()
          .eq("post_id", id)
          .in("platform", safeToRemove);
      }
    }
  }

  // --- SET POST TAGS (interní organizační štítky z tabulky tags) ---
  if (post && cleanData.tagIds !== undefined) {
    const tagResult = await setPostTags(id, cleanData.tagIds);
    if (!tagResult.success) {
      console.error("❌ POST TAGS ERROR:", tagResult.error);
    } else {
      console.log("✅ POST TAGS: nastaveno", cleanData.tagIds.length, "štítků");
    }
  }

  revalidatePath("/", "layout");
  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, data: post };
}

/**
 * Delete a post from Meta platforms (Facebook / Instagram) and from local DB.
 * Robust: if Meta API returns 404/400 (post already deleted externally),
 * we still remove the post from our DB (or mark it as 'removed_externally').
 */
export async function deletePost(id: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to delete a post." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const postPlatforms = post.post_platforms || [];
  const publishedPlatform = postPlatforms.find(p => p.status === 'published' && p.external_id);
  const targetPlatform = publishedPlatform?.platform ?? "facebook";
  const externalId = publishedPlatform?.external_id ?? null;
  const isPublished = postPlatforms.some(p => p.status === 'published');

  // Try to delete from Meta (Facebook / Instagram) if the post was published
  // Wrapped in try-catch: even if Meta API fails completely, we still delete from our DB
  try {
    if (externalId && isPublished) {


      const { data: accounts, error: accountError } = await supabase
        .from("social_accounts")
        .select("access_token")
        .eq("user_id", user.id)
        .ilike("platform", targetPlatform)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!accountError) {
        const accessToken =
          typeof accounts?.[0]?.access_token === "string" && accounts[0].access_token.trim()
            ? accounts[0].access_token.trim()
            : null;

        if (accessToken) {
          const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
          graphUrl.searchParams.set("access_token", accessToken);

          console.log(`Mazání příspěvku z ${targetPlatform}:`, { externalId });

          try {
            const graphRes = await fetch(graphUrl, { method: "DELETE", cache: "no-store" });
            const graphPayload = (await graphRes.json().catch(() => null)) as
              | { success?: boolean; error?: { message?: string; code?: number; error_subcode?: number } }
              | null;

            console.log(`META RESPONSE (delete ${targetPlatform}):`, graphPayload);

            // Meta returns 404 or 400 when the post was already deleted externally
            if (!graphRes.ok && (graphRes.status === 404 || graphRes.status === 400)) {
              console.log(`Příspěvek již byl smazán na ${targetPlatform} (status ${graphRes.status})`);
            } else if (graphPayload?.error) {
              const errCode = graphPayload.error.code ?? graphPayload.error.error_subcode;
              // Meta error codes for "Object not found" or "Object has been deleted"
              if (errCode === 190 || errCode === 1) {
                console.log(`Příspěvek již neexistuje na ${targetPlatform} (error code ${errCode})`);
              } else {
                console.error(`Smazání z ${targetPlatform} selhalo:`, graphPayload.error.message);
                // Still proceed to delete from our DB – don't block the user
              }
            } else {
              console.log(`Příspěvek úspěšně smazán z ${targetPlatform}:`, { externalId });
            }
          } catch (e) {
            console.error(`Network error deleting from ${targetPlatform}:`, e);
            // Still proceed – don't block the user
          }
        }
      }
    }
  } catch (outerError) {
    console.error("Unexpected error during Meta API delete, proceeding with DB delete:", outerError);
    // Still proceed – never block the user
  }

  // Normal hard delete from our DB
  const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

/**
 * Sync post status with the external platform.
 * Checks if a published post still exists on the platform it was
 * uploaded to. If not, marks it as 'removed_externally'.
 *
 * Platform-specific check:
 *   - facebook / instagram → Meta Graph API `GET /{external_id}?fields=id`
 *   - youtube             → YouTube Data API v3 `videos.list?id=…&part=status`
 *
 * YouTube handling is critical: a freshly uploaded video goes through
 * `processing` before becoming `uploaded`. During this window the video
 * DOES exist on YouTube but its `uploadStatus` is not "uploaded" yet.
 * We must NOT treat that as external removal – doing so would let the
 * user re-publish and the same video would be uploaded twice.
 */
export async function syncPostStatus(id: string): Promise<{
  success: boolean;
  removedExternally?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const postPlatforms = post.post_platforms || [];
  const publishedPlatform = postPlatforms.find(p => p.status === 'published' && p.external_id);
  const targetPlatform = publishedPlatform?.platform ?? "facebook";
  const externalId = publishedPlatform?.external_id ?? null;
  const isPublished = postPlatforms.some(p => p.status === 'published');

  if (!isPublished || !externalId) {
    return { success: true };
  }

  const nowIso = new Date().toISOString();

  // --- YouTube branch ---
  // YouTube access tokens expire after ~1 hour. Refresh transparently
  // before calling videos.list, otherwise we would hit a 401 and mark
  // the post as removed_externally (false positive).
  if (targetPlatform === "youtube") {
    const { data: ytAccounts } = await supabase
      .from("social_accounts")
      .select("id, user_id, platform, access_token, token_expires_at, metadata")
      .eq("user_id", user.id)
      .ilike("platform", "youtube")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const ytAccount = ytAccounts?.[0] as
      | {
          id: string;
          user_id: string;
          platform: string;
          access_token: string | null;
          token_expires_at: string | null;
          metadata: Record<string, unknown> | null;
        }
      | undefined;

    if (!ytAccount?.access_token) {
      // No token at all – skip this iteration, do NOT flip status.
      return { success: false, error: "Missing YouTube access token." };
    }

    const tokenResult = await getValidYouTubeAccessToken({ account: ytAccount });
    if (!tokenResult.success) {
      console.error(`[syncPostStatus] YouTube token refresh failed for post ${id}:`, tokenResult.error);
      return { success: true };
    }

    const check = await checkYouTubeVideoExists({
      accessToken: tokenResult.accessToken,
      videoId: externalId,
    });

    if (check.exists === false) {
      console.log(`[syncPostStatus] YouTube video ${externalId} no longer exists (post ${id})`);

      const { error: updateError } = await supabase
        .from("post_platforms")
        .update({
          status: "removed_externally",
          removed_at: nowIso,
          last_sync_at: nowIso,
        })
        .eq("post_id", id)
        .eq("platform", "youtube");

      if (updateError) {
        console.error("Error marking YouTube post as removed_externally:", updateError);
        return { success: false, error: updateError.message };
      }

      revalidateAllLocales("/dashboard");
      revalidateAllLocales("/calendar");
      revalidateAllLocales("/posts");
      return { success: true, removedExternally: true };
    }

    // Video still exists (uploadStatus may be "processing" – that is OK).
    // Just stamp last_sync_at so we don't hammer YouTube on every tick.
    if (check.exists === true) {
      console.log(`[syncPostStatus] YouTube video ${externalId} OK (uploadStatus=${check.uploadStatus}) for post ${id}`);
      await supabase
        .from("post_platforms")
        .update({ last_sync_at: nowIso })
        .eq("post_id", id)
        .eq("platform", "youtube");
    } else {
      // exists === null – network / auth failure – leave status as-is,
      // do NOT mark as removed_externally.
      console.warn(`[syncPostStatus] YouTube check inconclusive for post ${id}:`, check.error);
    }

    return { success: true };
  }

  // --- Meta branch (facebook / instagram) ---
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .ilike("platform", targetPlatform)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const accessToken =
    typeof accounts?.[0]?.access_token === "string" && accounts[0].access_token.trim()
      ? accounts[0].access_token.trim()
      : null;

  if (!accessToken) {
    return { success: false, error: `Missing access token for ${targetPlatform}.` };
  }

  // GET request to check if the post still exists on Meta
  const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
  graphUrl.searchParams.set("access_token", accessToken);
  graphUrl.searchParams.set("fields", "id");

  try {
    const res = await fetch(graphUrl, { method: "GET", cache: "no-store" });

    if (res.ok) {
      // Post still exists on Meta – update last_sync_at so we throttle.
      await supabase
        .from("post_platforms")
        .update({ last_sync_at: nowIso })
        .eq("post_id", id)
        .eq("platform", targetPlatform);
      return { success: true };
    }

    // Parse error payload to check for specific "object not found" codes
    const payload = (await res.json().catch(() => null)) as
      | { error?: { code?: number; error_subcode?: number; message?: string } }
      | null;

    const errCode = payload?.error?.code ?? payload?.error?.error_subcode;

    // Mark as removed_externally ONLY when the post is truly gone:
    // - HTTP 404 (Not Found)
    // - Meta error code 100 ("Object with ID does not exist")
    // - Meta error code 33 ("The specified resource does not exist")
    if (res.status === 404 || errCode === 100 || errCode === 33) {
      console.log(`Post ${id} no longer exists on ${targetPlatform} (status ${res.status}, code ${errCode})`);

      const { error: updateError } = await supabase
        .from("post_platforms")
        .update({
          status: "removed_externally",
          removed_at: nowIso,
          last_sync_at: nowIso,
        })
        .eq("post_id", id)
        .eq("platform", targetPlatform);

      if (updateError) {
        console.error("Error marking post as removed_externally:", updateError);
        return { success: false, error: updateError.message };
      }

      revalidateAllLocales("/dashboard");
      revalidateAllLocales("/calendar");
      revalidateAllLocales("/posts");
      return { success: true, removedExternally: true };
    }

    // Other errors (401 invalid token, 500 server error, etc.) – do NOT change status
    console.error(`Sync check failed for post ${id} on ${targetPlatform} (status ${res.status}, code ${errCode}):`, payload?.error?.message);
    return { success: true };
  } catch (e) {
    console.error("Network error syncing post status:", e);
    // Network error – do NOT change status
    return { success: true };
  }
}

/**
 * Reset a 'removed_externally' post back to 'draft' so the user can republish it.
 */
export async function resetPostStatus(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const hasRemoved = (post.post_platforms || []).some(p => p.status === "removed_externally");
  if (!hasRemoved) {
    return { success: false, error: "Only externally removed posts can be reset." };
  }

  const { error: updateError } = await supabase
    .from("post_platforms")
    .update({
      status: "draft",
      removed_at: null,
    })
    .eq("post_id", id)
    .eq("status", "removed_externally");

  if (updateError) {
    console.error("Error resetting post status:", updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`Post ${id} reset to draft – ready for republish`);

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

// ---------------------------------------------------------------------
// LinkedIn-specific soft delete (archive) helpers
// ---------------------------------------------------------------------
// Context: LinkedIn blocks Community Management API access for apps
// that already expose "Share on LinkedIn". This means we cannot verify
// whether a LinkedIn post still exists on the platform, nor can we
// delete it via API. To prevent accidental duplicate publishes and to
// preserve history, we offer a soft-delete ("archive") flow that keeps
// the post row in the DB with a clear status and timestamps.
// ---------------------------------------------------------------------

/**
 * Archive (soft-delete) the LinkedIn row of a published post from Postio.
 *
 * Unlike `deletePost`, this does NOT touch other platforms (Facebook,
 * Instagram, YouTube, …) – only the `linkedin` row in `post_platforms`.
 * The row keeps its `published_at` and `external_id` so the user can
 * see when it was originally published and restore it later if needed.
 *
 * Idempotent: calling twice on the same row is a no-op (returns success
 * with `alreadyArchived: true`).
 */
export async function archiveLinkedInPlatformRow(postId: string): Promise<{
  success: boolean;
  error?: string;
  alreadyArchived?: boolean;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Fetch the post + its LinkedIn row, scoped to the current user.
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const linkedinRow = (post.post_platforms || []).find(
    (p: any) => p.platform === "linkedin",
  );

  if (!linkedinRow) {
    return { success: false, error: "This post has no LinkedIn platform row." };
  }

  // Idempotency: if already archived, do nothing.
  if (linkedinRow.status === "archived") {
    return { success: true, alreadyArchived: true };
  }

  // Only published / removed_externally rows can be archived.
  // A draft/ scheduled/ failed row has nothing to "soft-delete" – the
  // user should just leave it as a draft or hard-delete the post.
  if (linkedinRow.status !== "published" && linkedinRow.status !== "removed_externally") {
    return {
      success: false,
      error: `Cannot archive a post that is in status "${linkedinRow.status}". Only published or removed_externally rows can be archived.`,
    };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("post_platforms")
    .update({
      status: "archived",
      archived_at: now,
      archive_reason: "user_archived_from_app",
    })
    .eq("id", linkedinRow.id);

  if (updateError) {
    console.error(`[archiveLinkedInPlatformRow] Failed for post ${postId}:`, updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`[archiveLinkedInPlatformRow] LinkedIn row archived for post ${postId} (was status=${linkedinRow.status})`);

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

/**
 * Restore an archived LinkedIn row back to draft so the user can
 * republish it. Clears `external_id` (we cannot guarantee it is still
 * valid – the post might have been deleted on the platform too) and
 * removes the archive metadata. The post can then be re-published via
 * the standard "Publikovat" flow.
 */
export async function restoreArchivedLinkedInPost(postId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const linkedinRow = (post.post_platforms || []).find(
    (p: any) => p.platform === "linkedin",
  );

  if (!linkedinRow) {
    return { success: false, error: "This post has no LinkedIn platform row." };
  }

  if (linkedinRow.status !== "archived") {
    return {
      success: false,
      error: `Only archived rows can be restored. Current status: "${linkedinRow.status}".`,
    };
  }

  const { error: updateError } = await supabase
    .from("post_platforms")
    .update({
      status: "draft",
      archived_at: null,
      archive_reason: null,
      // Clear external_id – we cannot guarantee the original URN is
      // still valid (the post may have been deleted on the platform
      // too, in which case republishing would otherwise fail or
      // create a duplicate). The user can re-publish via the normal
      // flow which will get a fresh URN.
      external_id: null,
    })
    .eq("id", linkedinRow.id);

  if (updateError) {
    console.error(`[restoreArchivedLinkedInPost] Failed for post ${postId}:`, updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`[restoreArchivedLinkedInPost] LinkedIn row restored to draft for post ${postId}`);

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

export async function getPosts(status?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    console.log(error);
    return { success: false, error: error.message };
  }

  const processedData = data?.map(post => {
    const postPlatforms = post.post_platforms || [];
    postPlatforms.sort((a: any, b: any) => a.platform.localeCompare(b.platform));

    const statuses = postPlatforms.map((p: any) => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";
    // `archived` only wins when NOTHING is published, scheduled or
    // currently being processed – i.e. the post is purely historical.
    // If at least one platform is still live (published/scheduled/etc.)
    // we keep the more informative status and the per-platform badge
    // surfaces the archive detail to the user.
    else if (statuses.length > 0 && statuses.every((s: string) => s === "archived")) {
      computedStatus = "archived";
    }

    // Normalize post_tags → flat array of { id, name, color }.
    // Supabase returns the join as [{ tags: { id, name, color } | null }].
    type TagJoinRow = { tags: { id: string; name: string; color: string } | null };
    const normalizedPostTags = ((post.post_tags ?? []) as TagJoinRow[])
      .map((row) => row.tags)
      .filter((t): t is { id: string; name: string; color: string } => t !== null);

    return {
      ...post,
      status: computedStatus,
      platforms: postPlatforms.map((p: any) => p.platform),
      post_platforms: postPlatforms,
      post_tags: normalizedPostTags,
    };
  });

  const filteredData = status ? processedData?.filter(p => p.status === status) : processedData;
  return { success: true, data: filteredData ?? [] };
}

export async function getPost(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return { success: false, error: error.message };
  }

  if (data?.post_platforms && Array.isArray(data.post_platforms)) {
    data.post_platforms.sort((a: { platform: string }, b: { platform: string }) => a.platform.localeCompare(b.platform));
    const statuses = data.post_platforms.map((p: any) => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";

    data.status = computedStatus;
    data.platforms = data.post_platforms.map((p: any) => p.platform);
  }

  // Normalize post_tags (same as in getPosts)
  if (data) {
    type TagJoinRow = { tags: { id: string; name: string; color: string } | null };
    data.post_tags = ((data.post_tags ?? []) as TagJoinRow[])
      .map((row) => row.tags)
      .filter((t): t is { id: string; name: string; color: string } => t !== null);
  }

  return { success: true, data };
}

/**
 * Batch-sync all published posts with external_id.
 * Throttle: skip posts synced within the last 30 minutes (last_sync_at).
 * Returns list of post IDs that were marked as removed_externally.
 */
export async function syncPublishedPosts(): Promise<{
  success: boolean;
  removedIds?: string[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Pre-fetch all social_accounts once – avoids N+1 and lets us cache the
  // refreshed YouTube tokens across many posts for the same channel.
  // `platform_id` is required by `getValidLinkedInAccessToken` (author URN)
  // and included here even though only the LinkedIn sync branch needs it.
  const { data: accountsData } = await supabase
    .from("social_accounts")
    .select("id, user_id, platform, access_token, token_expires_at, metadata, platform_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  type AccountRow = {
    id: string;
    user_id: string;
    platform: string;
    access_token: string | null;
    token_expires_at: string | null;
    metadata: Record<string, unknown> | null;
    platform_id: string | null;
  };
  const accountsByPlatform = new Map<string, AccountRow>();
  for (const a of (accountsData ?? []) as AccountRow[]) {
    if (!accountsByPlatform.has(a.platform)) {
      accountsByPlatform.set(a.platform, a);
    }
  }
  // Cache of refreshed YouTube access tokens keyed by account.id so we
  // don't burn Google's refresh-token quota on every post in the batch.
  const refreshedYouTubeTokens = new Map<string, string>();

  // Find published posts with external_ids that haven't been synced in 30 min
  const { data: postsData, error: queryError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("user_id", user.id);

  if (queryError || !postsData) {
    console.error("Error fetching posts for sync:", queryError);
    return { success: false, error: queryError?.message ?? "Query failed" };
  }

  type PostPlatformRow = {
    id?: string;
    platform: string;
    status: string;
    external_id: string | null;
    last_sync_at?: string | null;
  };

  // Flatten: one item per (post_id, platform) pair we need to check.
  type SyncItem = { postId: string; pp: PostPlatformRow };
  const toSync: SyncItem[] = [];
  for (const post of postsData) {
    for (const pp of (post.post_platforms ?? []) as PostPlatformRow[]) {
      if (pp.status !== "published") continue;
      if (!pp.external_id) continue;
      if (pp.last_sync_at && new Date(pp.last_sync_at) >= new Date(thirtyMinAgo)) continue;
      toSync.push({ postId: post.id, pp });
    }
  }

  if (toSync.length === 0) {
    return { success: true, removedIds: [] };
  }

  console.log(`[syncPublishedPosts] Syncing ${toSync.length} published platform row(s)`);

  const removedIds: string[] = [];
  const now = new Date().toISOString();

  for (const { postId, pp } of toSync) {
    const targetPlatform = pp.platform;
    const externalId = pp.external_id;
    if (!externalId) continue;

    try {
      // --- YouTube branch ---
      if (targetPlatform === "youtube") {
        const ytAccount = accountsByPlatform.get("youtube");
        if (!ytAccount?.access_token) {
          console.warn(`[syncPublishedPosts] No YouTube account for user, skipping post ${postId}`);
          continue;
        }

        let accessToken = refreshedYouTubeTokens.get(ytAccount.id);
        if (!accessToken) {
          const tokenResult = await getValidYouTubeAccessToken({ account: ytAccount });
          if (!tokenResult.success) {
            console.warn(`[syncPublishedPosts] YouTube token refresh failed for post ${postId}:`, tokenResult.error);
            continue;
          }
          accessToken = tokenResult.accessToken;
          refreshedYouTubeTokens.set(ytAccount.id, accessToken);
        }

        const check = await checkYouTubeVideoExists({
          accessToken,
          videoId: externalId,
        });

        if (check.exists === false) {
          console.log(`[syncPublishedPosts] YouTube video ${externalId} no longer exists (post ${postId})`);
          await supabase
            .from("post_platforms")
            .update({
              status: "removed_externally",
              removed_at: now,
              last_sync_at: now,
            })
            .eq("post_id", postId)
            .eq("platform", "youtube");
          removedIds.push(postId);
        } else if (check.exists === true) {
          // Still exists – stamp last_sync_at so we don't hammer YouTube.
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: now })
            .eq("post_id", postId)
            .eq("platform", "youtube");
        } else {
          // exists === null – inconclusive (network/auth) – leave alone.
          console.warn(`[syncPublishedPosts] YouTube check inconclusive for post ${postId}:`, check.error);
        }
        continue;
      }

      // --- LinkedIn branch ---
      // Without this branch LinkedIn posts fall through to the Meta branch
      // below, which queries `graph.facebook.com` – Meta obviously has no
      // record of a LinkedIn URN and replies 404, so every freshly
      // published LinkedIn post gets falsely flagged as
      // `removed_externally` within a few minutes.
      //
      // LinkedIn exposes two endpoints depending on the URN format we got
      // back from the publish call:
      //   - `urn:li:ugcPost:{id}` → `GET /v2/ugcPosts/{id}`
      //   - `urn:li:share:{id}`   → `GET /v2/shares/{id}` (legacy but
      //                             still returned by the current
      //                             ugcPosts API as `x-restli-id`)
      // Both return 200 when the post is live and 404 once the author (or
      // LinkedIn itself) removes it. 401/403/5xx are treated as
      // inconclusive – we don't want to false-positive a token issue.
      if (targetPlatform === "linkedin") {
        const liAccount = accountsByPlatform.get("linkedin");
        if (!liAccount) {
          console.warn(`[syncPublishedPosts] No LinkedIn account for user, skipping post ${postId}`);
          continue;
        }

        const tokenResult = await getValidLinkedInAccessToken({ account: liAccount });
        if (!tokenResult.success) {
          console.warn(`[syncPublishedPosts] LinkedIn token refresh failed for post ${postId}:`, tokenResult.error);
          continue;
        }
        const accessToken = tokenResult.accessToken;

        let endpoint: string | null = null;
        if (externalId.startsWith("urn:li:ugcPost:")) {
          endpoint = `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(externalId)}`;
        } else if (externalId.startsWith("urn:li:share:")) {
          endpoint = `https://api.linkedin.com/v2/shares/${encodeURIComponent(externalId)}`;
        } else {
          console.warn(`[syncPublishedPosts] LinkedIn URN format not recognized for post ${postId}: ${externalId}`);
          continue;
        }

        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
          cache: "no-store",
        });

        if (res.status === 404) {
          console.log(`[syncPublishedPosts] Post ${postId} removed on linkedin`);
          await supabase
            .from("post_platforms")
            .update({
              status: "removed_externally",
              removed_at: now,
              last_sync_at: now,
            })
            .eq("post_id", postId)
            .eq("platform", "linkedin");
          removedIds.push(postId);
        } else if (res.ok) {
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: now })
            .eq("post_id", postId)
            .eq("platform", "linkedin");
        } else if (res.status === 403) {
          // LinkedIn blocks `Community Management API` (read endpoints
          // /v2/ugcPosts, /v2/shares) for apps that only have the
          // `Share on LinkedIn` product. This is a platform-level
          // restriction we cannot bypass without applying for CM API
          // access, which LinkedIn rejects for apps that already
          // expose Share on LinkedIn. Treat this as a known
          // limitation: silently assume the post still exists and
          // stamp `last_sync_at` so we don't hammer the endpoint
          // every 30 minutes.
          console.log(`[syncPublishedPosts] LinkedIn sync skipped: CM API not available for this app scope. (post ${postId})`);
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: now })
            .eq("post_id", postId)
            .eq("platform", "linkedin");
        } else {
          // 401, 5xx, network – genuine API problem, treat as
          // inconclusive but stamp `last_sync_at` so we don't loop
          // forever on the same failing call.
          console.warn(`[syncPublishedPosts] LinkedIn check inconclusive (HTTP ${res.status}) for post ${postId}`);
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: now })
            .eq("post_id", postId)
            .eq("platform", "linkedin");
        }
        continue;
      }

      // --- Meta branch (facebook / instagram) ---
      const metaAccount = accountsByPlatform.get(targetPlatform);
      const accessToken =
        typeof metaAccount?.access_token === "string" && metaAccount.access_token.trim()
          ? metaAccount.access_token.trim()
          : null;

      if (!accessToken) {
        console.warn(`[syncPublishedPosts] No access token for ${targetPlatform}, skipping post ${postId}`);
        continue;
      }

      const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
      graphUrl.searchParams.set("access_token", accessToken);
      graphUrl.searchParams.set("fields", "id");

      const res = await fetch(graphUrl, { method: "GET", cache: "no-store" });

      if (!res.ok && (res.status === 404 || res.status === 400)) {
        // Post was removed externally on Meta
        console.log(`[syncPublishedPosts] Post ${postId} removed on ${targetPlatform}`);
        await supabase
          .from("post_platforms")
          .update({
            status: "removed_externally",
            removed_at: now,
            last_sync_at: now,
          })
          .eq("post_id", postId)
          .eq("platform", targetPlatform);
        removedIds.push(postId);
      } else {
        // Post still exists – just update last_sync_at
        await supabase
          .from("post_platforms")
          .update({ last_sync_at: now })
          .eq("post_id", postId)
          .eq("platform", targetPlatform);
      }
    } catch (e) {
      console.error(`[syncPublishedPosts] Error for post ${postId} on ${targetPlatform}:`, e);
    }
  }

  if (removedIds.length > 0) {
    console.log(`[syncPublishedPosts] Marked ${removedIds.length} post(s) as removed_externally`);
  }

  return { success: true, removedIds };
}

/**
 * Smart Delete: handle posts marked as removed_externally.
 * - "keep_as_draft": reset post_platforms status to draft, keep post in DB for republishing
 * - "delete_from_app": hard delete the post from DB entirely
 * autoDelete: "never" | "3d" | "7d" | "30d" | "365d" – sets auto_delete_at timestamp
 */
export async function smartDeletePost(
  id: string,
  mode: "keep_as_draft" | "delete_from_app",
  autoDelete?: "never" | "3d" | "7d" | "30d" | "365d"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Calculate auto_delete_at if set
  let autoDeleteAt: string | null = null;
  if (autoDelete && autoDelete !== "never") {
    const daysMap: Record<string, number> = { "3d": 3, "7d": 7, "30d": 30, "365d": 365 };
    const days = daysMap[autoDelete];
    if (days) {
      autoDeleteAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  if (mode === "keep_as_draft") {
    // Reset all removed_externally platforms to draft
    const { error: updateError } = await supabase
      .from("post_platforms")
      .update({
        status: "draft",
        published_at: null,
        external_id: null,
        removed_at: null,
      })
      .eq("post_id", id)
      .eq("status", "removed_externally");

    if (updateError) {
      console.error("Error resetting post to draft:", updateError);
      return { success: false, error: updateError.message };
    }

    // Set auto_delete_at if requested
    if (autoDeleteAt) {
      await supabase
        .from("posts")
        .update({ auto_delete_at: autoDeleteAt })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    revalidateAllLocales("/dashboard");
    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    return { success: true };
  }

  // Hard delete from DB
  const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

/**
 * Auto-delete posts that have passed their auto_delete_at timestamp.
 * Called periodically (e.g. on page load via syncPublishedPosts or a cron).
 */
export async function cleanupAutoDeletedPosts(): Promise<{ success: boolean; deletedCount: number }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, deletedCount: 0 };
  }

  const now = new Date().toISOString();

  // Find posts with auto_delete_at in the past
  const { data: posts, error: queryError } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", user.id)
    .not("auto_delete_at", "is", null)
    .lt("auto_delete_at", now);

  if (queryError || !posts) {
    console.error("Error fetching auto-delete posts:", queryError);
    return { success: false, deletedCount: 0 };
  }

  if (posts.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  // Delete all expired posts
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .in("id", posts.map(p => p.id))
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Error deleting auto-expired posts:", deleteError);
    return { success: false, deletedCount: 0 };
  }

  console.log(`[cleanupAutoDeletedPosts] Deleted ${posts.length} post(s)`);

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, deletedCount: posts.length };
}
