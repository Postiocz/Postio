"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { setPostTags } from "@/lib/actions/tag-actions";
import {
  checkYouTubeVideoExists,
  getValidYouTubeAccessToken,
} from "@/lib/actions/publish-youtube";
import { getValidLinkedInAccessToken } from "@/lib/actions/publish-linkedin";
import type { PostStatus } from "@/lib/types";

const LOCALES = ["cs", "en", "uk"];

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

type PostPlatformStatusRow = {
  platform: string;
  status: string;
};

export async function createPostAction(inputData: {
  content: string;
  platforms?: string[];
  /** Account-level selection – when present, post_platforms rows get
   *  account_id from social_accounts instead of just a platform string.
   *  Enables multi-account publishing (Krok 3, Prompt 027). */
  accountIds?: string[];
  scheduledAt?: string | null;
  status: "draft" | "scheduled" | "published";
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
  tagIds?: string[];
  platformMetadata?: Record<string, Record<string, unknown>>;
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

  // --- DUAL WRITE: Sync platforms/accounts to post_platforms ---
  if (post && ((cleanData.platforms?.length ?? 0) > 0 || (cleanData.accountIds?.length ?? 0) > 0)) {
    const activePlatforms = cleanData.platforms ?? [];
    console.log("🔥 DUAL-WRITE START: vytvářím instance pro", activePlatforms);

    let platformRows;

    if (cleanData.accountIds && cleanData.accountIds.length > 0) {
      // Account-based selection (Krok 3) – look up platform per account
      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("id, platform")
        .in("id", cleanData.accountIds);
      const accountMap = new Map(accounts?.map((a) => [a.id, a.platform]) ?? []);

      platformRows = cleanData.accountIds.map((accountId) => ({
        post_id: post.id,
        platform: accountMap.get(accountId) ?? "facebook",
        account_id: accountId,
        status: cleanData.status === "scheduled" ? "scheduled" : "draft",
        scheduled_at: cleanData.scheduledAt,
        metadata: cleanData.platformMetadata?.[accountMap.get(accountId) ?? ""] ?? {},
      }));
    } else {
      // Legacy platform-based selection
      platformRows = (cleanData.platforms ?? []).map((p) => ({
        post_id: post.id,
        platform: p,
        status: cleanData.status === "scheduled" ? "scheduled" : "draft",
        scheduled_at: cleanData.scheduledAt,
        metadata: cleanData.platformMetadata?.[p] ?? {},
      }));
    }

    const { error: ppError } = await supabase.from("post_platforms").insert(platformRows);

    if (ppError) {
      console.error("❌ DUAL-WRITE ERROR:", ppError.message);
    } else {
      console.log("✅ DUAL-WRITE SUCCESS:", platformRows.length, "instancí zapsáno.");
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
  /** Account-level selection – when present, post_platforms rows are
   *  diffed by account_id instead of platform string. Supports
   *  multiple accounts of the same platform (Krok 3, Prompt 027). */
  accountIds?: string[];
  scheduledAt?: string | null;
  status?: PostStatus;
  mediaUrls?: string[];
  location?: string;
  tags?: string[];
  tagIds?: string[];
  platformMetadata?: Record<string, Record<string, unknown>>;
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

  // --- DUAL WRITE: Sync platforms/accounts to post_platforms ---
  if (post && (cleanData.accountIds !== undefined || cleanData.platforms !== undefined)) {
    const { data: existingInstances } = await supabase
      .from("post_platforms")
      .select("id, platform, account_id, status, metadata")
      .eq("post_id", id);

    if (cleanData.accountIds !== undefined) {
      // Account-based diff (Krok 3) – compare by account_id
      const existingNonPublished = (existingInstances || []).filter(
        (i) => i.status !== "published" && i.status !== "publishing",
      );
      const existingAccountIds = existingNonPublished.map((i) => i.account_id);
      const newAccountIds = cleanData.accountIds;

      // To add: accounts selected but not yet in DB
      const toAdd = newAccountIds.filter((id) => !existingAccountIds.includes(id));
      if (toAdd.length > 0) {
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("id, platform")
          .in("id", toAdd);
        const accountMap = new Map(accounts?.map((a) => [a.id, a.platform]) ?? []);

        await supabase.from("post_platforms").insert(
          toAdd.map((accountId) => ({
            post_id: id,
            platform: accountMap.get(accountId) ?? "facebook",
            account_id: accountId,
            status: safeStatus === "scheduled" ? "scheduled" : "draft",
            scheduled_at:
              safeStatus === "scheduled"
                ? (cleanData.scheduledAt ?? post.scheduled_at)
                : null,
            metadata:
              cleanData.platformMetadata?.[accountMap.get(accountId) ?? ""] ?? {},
          })),
        );
      }

      // To remove: accounts deselected (skip published/publishing)
      const toRemove = existingNonPublished.filter(
        (i) => !newAccountIds.includes(i.account_id ?? ""),
      );
      if (toRemove.length > 0) {
        await supabase
          .from("post_platforms")
          .delete()
          .in("id", toRemove.map((i) => i.id));
      }
    } else if (cleanData.platforms !== undefined) {
      // Legacy platform-based diff
      const existingPlatforms = (existingInstances || []).map((i) => i.platform);
      const newPlatforms = cleanData.platforms;

      const toAdd = newPlatforms.filter((p) => !existingPlatforms.includes(p));
      if (toAdd.length > 0) {
        await supabase.from("post_platforms").insert(
          toAdd.map((p) => ({
            post_id: id,
            platform: p,
            status: safeStatus === "scheduled" ? "scheduled" : "draft",
            scheduled_at:
              safeStatus === "scheduled"
                ? (cleanData.scheduledAt ?? post.scheduled_at)
                : null,
            metadata: cleanData.platformMetadata?.[p] ?? {},
          })),
        );
      }

      const toRemove = existingPlatforms.filter((p) => !newPlatforms.includes(p));
      if (toRemove.length > 0) {
        const safeToRemove = (existingInstances || [])
          .filter(
            (i) =>
              toRemove.includes(i.platform) &&
              i.status !== "published" &&
              i.status !== "publishing",
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

    // Metadata update (shared – works with both account and platform paths)
    if (cleanData.platformMetadata) {
      for (const [platform, metadataPatch] of Object.entries(cleanData.platformMetadata)) {
        const existingMetadata = (existingInstances || []).find((row) => row.platform === platform)?.metadata;
        await supabase
          .from("post_platforms")
          .update({
            metadata: {
              ...((existingMetadata && typeof existingMetadata === "object") ? existingMetadata : {}),
              ...metadataPatch,
            },
          })
          .eq("post_id", id)
          .eq("platform", platform);
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
 * Soft-delete a post: archives all post_platforms rows, sets deleted_at
 * timestamp, and clears media_urls to save storage. The post stays in the
 * DB as a historical "footprint" visible in the calendar.
 *
 * Also attempts to delete from Meta (Facebook / Instagram) via Graph API
 * if the post was published, but gracefully handles 404/400 errors
 * (post already deleted externally).
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

  // Soft delete: archive post_platforms, set deleted_at, clear media_urls
  // The post stays in the DB as a historical "footprint" in the calendar.
  const now = new Date().toISOString();

  // Archive all non-archived post_platforms rows
  const { error: ppError } = await supabase
    .from("post_platforms")
    .update({
      status: "archived",
      archived_at: now,
      archive_reason: "user_removed_from_app",
    })
    .eq("post_id", id)
    .neq("status", "archived");

  if (ppError) {
    console.error("Error archiving post platforms:", ppError);
    return { success: false, error: ppError.message };
  }

  // Soft-delete the post itself: set deleted_at, clear media_urls to save storage
  const { error } = await supabase
    .from("posts")
    .update({
      deleted_at: now,
      media_urls: [],
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error soft-deleting post:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true };
}

/**
 * Bulk-delete multiple posts from the Postio DB (#10).
 * Does NOT attempt per-post API deletion (e.g. Meta Graph) — that is handled
 * by the single-post `deletePost` flow. This is a fast, client-initiated
 * "remove from app" action for drafts / scheduled / failed posts.
 *
 * @param ids - array of post IDs to delete
 */
export async function bulkDeletePosts(ids: string[]) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to delete posts." };
  }

  if (ids.length === 0) {
    return { success: false, error: "No posts selected." };
  }

  // Delete only posts belonging to this user (RLS enforces this too)
  const { error } = await supabase
    .from("posts")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error bulk-deleting posts:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/dashboard");
  revalidateAllLocales("/calendar");
  revalidateAllLocales("/posts");
  return { success: true, deletedCount: ids.length };
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
// LinkedIn-specific helpers
// ---------------------------------------------------------------------
// LinkedIn UGC Posts API supports DELETE /v2/ugcPosts/{id}, but the
// user's "Smazat z LinkedIn" request from the DeletePostDialog is now
// treated as an "API not supported" platform (Instagram-like flow) –
// the user is asked to remove the post manually on LinkedIn instead.
// Rationale: (1) Postio has no working automatic sync for LinkedIn
// (the Community Management API returns 403 for our Developer App), so
// the user has no reliable way to discover that the post is gone;
// (2) giving the user a false sense of "deleted everywhere" via a one-
// click API call would silently leak zombie posts; (3) the same flow is
// already used for Instagram (`cannotDeleteViaApi: true` branch in
// `deleteFromMeta`), so we keep the UI consistent. To preserve the
// "soft delete" UX for the user, the LinkedIn row stays in
// `status="published"` until the user actually removes it on the
// platform – then `syncPublishedPosts` would notice (CM API not
// authorized, so this is best-effort) and the user can use the regular
// Edit + Delete dialog again afterwards.
// ---------------------------------------------------------------------

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
    const postPlatforms = (post.post_platforms ?? []) as PostPlatformStatusRow[];
    postPlatforms.sort((a, b) => a.platform.localeCompare(b.platform));

    const statuses = postPlatforms.map((p) => p.status);
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
      platforms: postPlatforms.map((p) => p.platform),
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
    const postPlatforms = data.post_platforms as PostPlatformStatusRow[];
    postPlatforms.sort((a, b) => a.platform.localeCompare(b.platform));
    const statuses = postPlatforms.map((p) => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";

    data.status = computedStatus;
    data.platforms = postPlatforms.map((p) => p.platform);
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
