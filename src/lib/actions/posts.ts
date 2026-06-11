"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
      platforms: cleanData.platforms,
      scheduled_at: cleanData.scheduledAt,
      status: cleanData.status,
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
  if (cleanData.platforms !== undefined) updateData.platforms = cleanData.platforms;
  if (cleanData.scheduledAt !== undefined) updateData.scheduled_at = cleanData.scheduledAt;
  if (safeStatus !== undefined) updateData.status = safeStatus;
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
    .select("id, platforms, external_ids, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const targetPlatform = platforms[0] ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;

  // Try to delete from Meta (Facebook / Instagram) if the post was published
  // Wrapped in try-catch: even if Meta API fails completely, we still delete from our DB
  let alreadyDeletedExternally = false;
  try {
    if (externalId && post.status === "published") {
      const targetPlatform = platforms[0] ?? "facebook";

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
              alreadyDeletedExternally = true;
            } else if (graphPayload?.error) {
              const errCode = graphPayload.error.code ?? graphPayload.error.error_subcode;
              // Meta error codes for "Object not found" or "Object has been deleted"
              if (errCode === 190 || errCode === 1) {
                console.log(`Příspěvek již neexistuje na ${targetPlatform} (error code ${errCode})`);
                alreadyDeletedExternally = true;
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

  // If the post was already deleted externally, mark it instead of hard deleting
  if (alreadyDeletedExternally) {
    const targetPlatform = platforms[0] ?? "unknown";
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        status: "removed_externally",
        removed_at: new Date().toISOString(),
        removed_from_platform: targetPlatform,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error marking post as removed_externally:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Post ${id} označen jako removed_externally (platforma: ${targetPlatform})`);

    revalidateAllLocales("/dashboard");
    revalidateAllLocales("/calendar");
    revalidateAllLocales("/posts");
    return { success: true, removedExternally: true };
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
 * Sync post status with Meta API.
 * Checks if a published post still exists on the external platform.
 * If not, marks it as 'removed_externally'.
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
    .select("id, platforms, external_ids, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  const platforms = Array.isArray(post.platforms) ? post.platforms : [];
  const targetPlatform = platforms[0] ?? "facebook";

  const externalIds = (post.external_ids as Record<string, string>) ?? {};
  const externalId = externalIds[targetPlatform]
    ? externalIds[targetPlatform].trim()
    : null;

  if (post.status !== "published" || !externalId) {
    return { success: true };
  }

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

  // GET request to check if the post still exists
  const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
  graphUrl.searchParams.set("access_token", accessToken);
  graphUrl.searchParams.set("fields", "id");

  try {
    const res = await fetch(graphUrl, { method: "GET", cache: "no-store" });

    if (res.ok) {
      // Post still exists on the platform – nothing to do
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
        .from("posts")
        .update({
          status: "removed_externally",
          removed_at: new Date().toISOString(),
          removed_from_platform: targetPlatform,
        })
        .eq("id", id)
        .eq("user_id", user.id);

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
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post not found." };
  }

  if (post.status !== "removed_externally") {
    return { success: false, error: "Only externally removed posts can be reset." };
  }

  const { error: updateError } = await supabase
    .from("posts")
    .update({
      status: "draft",
      removed_at: null,
      removed_from_platform: null,
      external_ids: {},
    })
    .eq("id", id)
    .eq("user_id", user.id);

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

export async function getPosts(status?: string) {
  const supabase = await createClient();

  let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

export async function getPost(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return { success: false, error: error.message };
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

  // Find published posts with external_ids that haven't been synced in 30 min
  const { data: posts, error: queryError } = await supabase
    .from("posts")
    .select("id, platforms, external_ids, status, last_sync_at")
    .eq("user_id", user.id)
    .eq("status", "published")
    .not("external_ids", "is", null)
    .or(`last_sync_at.is.null,last_sync_at.lt.${thirtyMinAgo}`);

  if (queryError || !posts) {
    console.error("Error fetching posts for sync:", queryError);
    return { success: false, error: queryError?.message ?? "Query failed" };
  }

  if (posts.length === 0) {
    return { success: true, removedIds: [] };
  }

  console.log(`[syncPublishedPosts] Syncing ${posts.length} published post(s)`);

  const removedIds: string[] = [];
  const now = new Date().toISOString();

  // Process each post – check if it still exists on the external platform
  for (const post of posts) {
    const platforms = Array.isArray(post.platforms) ? post.platforms : [];
    const targetPlatform = platforms[0] ?? "facebook";
    
    const externalIds = (post.external_ids as Record<string, string>) ?? {};
    const externalId = externalIds[targetPlatform]
      ? externalIds[targetPlatform].trim()
      : null;

    if (!externalId) continue;

    // Get access token for the target platform
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
      console.warn(`[syncPublishedPosts] No access token for ${targetPlatform}, skipping post ${post.id}`);
      continue;
    }

    // Check if post still exists on Meta
    const graphUrl = new URL(`https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}`);
    graphUrl.searchParams.set("access_token", accessToken);
    graphUrl.searchParams.set("fields", "id");

    try {
      const res = await fetch(graphUrl, { method: "GET", cache: "no-store" });

      if (!res.ok && (res.status === 404 || res.status === 400)) {
        // Post was removed externally
        console.log(`[syncPublishedPosts] Post ${post.id} removed on ${targetPlatform}`);

        await supabase
          .from("posts")
          .update({
            status: "removed_externally",
            removed_at: now,
            removed_from_platform: targetPlatform,
            last_sync_at: now,
          })
          .eq("id", post.id)
          .eq("user_id", user.id);

        removedIds.push(post.id);
      } else {
        // Post still exists – just update last_sync_at
        await supabase
          .from("posts")
          .update({ last_sync_at: now })
          .eq("id", post.id)
          .eq("user_id", user.id);
      }
    } catch (e) {
      console.error(`[syncPublishedPosts] Network error for post ${post.id}:`, e);
    }
  }

  if (removedIds.length > 0) {
    console.log(`[syncPublishedPosts] Marked ${removedIds.length} post(s) as removed_externally`);
  }

  return { success: true, removedIds };
}
