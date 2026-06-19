"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { setPostTags } from "@/lib/actions/tag-actions";

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
        .from("post_platforms")
        .update({
          status: "removed_externally",
          removed_at: new Date().toISOString(),
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

  // Find published posts with external_ids that haven't been synced in 30 min
  const { data: postsData, error: queryError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("user_id", user.id);
  // Post-filter to find published ones
  const posts = (postsData || []).filter(p => {
    return (p.post_platforms || []).some(pp => pp.status === 'published' && pp.external_id && (!pp.last_sync_at || new Date(pp.last_sync_at) < new Date(thirtyMinAgo)));
  });

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
    const pp = post.post_platforms.find((p: any) => p.status === 'published' && p.external_id && (!p.last_sync_at || new Date(p.last_sync_at) < new Date(thirtyMinAgo)));
    if (!pp) continue;
    const targetPlatform = pp.platform;
    const externalId = pp.external_id;

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
          .from("post_platforms")
          .update({
            status: "removed_externally",
            removed_at: now,
            last_sync_at: now,
          })
          .eq("post_id", post.id)
          .eq("platform", targetPlatform);

        removedIds.push(post.id);
      } else {
        // Post still exists – just update last_sync_at
        await supabase
          .from("post_platforms")
          .update({ last_sync_at: now })
          .eq("post_id", post.id)
          .eq("platform", targetPlatform);
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
