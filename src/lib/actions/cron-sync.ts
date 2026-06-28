"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Cron-safe version of syncPublishedPosts for a specific user.
 * Uses admin client to bypass RLS without needing session cookies.
 */
export async function syncPublishedPostsForUser(userId: string) {
  const supabase = createAdminClient();

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Pre-fetch all social_accounts once
  const { data: accountsData } = await supabase
    .from("social_accounts")
    .select("id, user_id, platform, access_token, token_expires_at, metadata, platform_id")
    .eq("user_id", userId)
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
  const refreshedYouTubeTokens = new Map<string, string>();

  // Find published posts with external_ids that haven't been synced in 30 min
  const { data: postsData, error: queryError } = await supabase
    .from("posts")
    .select("id, post_platforms(*)")
    .eq("user_id", userId);

  if (queryError || !postsData) {
    console.error("[cron] Error fetching posts for sync:", queryError);
    return { success: false, error: queryError?.message ?? "Query failed" };
  }

  type PostPlatformRow = {
    id?: string;
    platform: string;
    status: string;
    external_id: string | null;
    last_sync_at?: string | null;
  };

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

  console.log(`[cron:syncPublishedPosts] Syncing ${toSync.length} published platform row(s) for user ${userId}`);

  const removedIds: string[] = [];
  const now = new Date().toISOString();

  for (const { postId, pp } of toSync) {
    const targetPlatform = pp.platform;
    const externalId = pp.external_id;
    if (!externalId) continue;

    try {
      if (targetPlatform === "youtube") {
        const ytAccount = accountsByPlatform.get("youtube");
        if (!ytAccount?.access_token) {
          console.warn(`[cron] No YouTube account for user ${userId}, skipping post ${postId}`);
          continue;
        }

        let accessToken = refreshedYouTubeTokens.get(ytAccount.id);
        if (!accessToken) {
          const { getValidYouTubeAccessToken } = await import("@/lib/actions/publish-youtube");
          const tokenResult = await getValidYouTubeAccessToken({ account: ytAccount });
          if (!tokenResult.success) {
            console.warn(`[cron] YouTube token refresh failed for post ${postId}:`, tokenResult.error);
            continue;
          }
          accessToken = tokenResult.accessToken;
          refreshedYouTubeTokens.set(ytAccount.id, accessToken);
        }

        const { checkYouTubeVideoExists } = await import("@/lib/actions/publish-youtube");
        const check = await checkYouTubeVideoExists({ accessToken, videoId: externalId });

        if (!check.exists) {
          console.log(`[cron] YouTube video ${externalId} no longer exists (post ${postId})`);
          const ppId = (pp as any).id;
          if (ppId) {
            await supabase
              .from("post_platforms")
              .update({ status: "removed_externally", updated_at: now, last_sync_at: now })
              .eq("id", ppId);
            removedIds.push(postId);
          }
        } else {
          console.log(`[cron] YouTube video ${externalId} OK for post ${postId}`);
          const ppId = (pp as any).id;
          if (ppId) {
            await supabase
              .from("post_platforms")
              .update({ last_sync_at: now })
              .eq("id", ppId);
          }
        }
      } else if (targetPlatform === "linkedin") {
        const liAccount = accountsByPlatform.get("linkedin");
        if (!liAccount?.access_token) {
          console.warn(`[cron] No LinkedIn account for user ${userId}, skipping post ${postId}`);
          continue;
        }

        const { getValidLinkedInAccessToken } = await import("@/lib/actions/publish-linkedin");
        const liResult = await getValidLinkedInAccessToken({ account: liAccount });
        if (!liResult.success) {
          console.warn(`[cron] LinkedIn token refresh failed for post ${postId}:`, liResult.error);
          continue;
        }
        const liToken = liResult.accessToken;

        // Extract post URN from external_id: urn:li:share:urn:li:post:CXXXXXX -> CXXXXXX
        const match = externalId.match(/:(C[A-Z0-9]+)$/);
        if (!match) {
          console.warn(`[cron] LinkedIn URN format not recognized for post ${postId}: ${externalId}`);
          continue;
        }
        const postCode = match[1];

        const response = await fetch(
          `https://api.linkedin.com/v2/actions/shareRegistry?ownershipEntity=urn%3Ali%3Aorganization%3A&q=resolved&projection=(elements[ownedBy,lifeState])`,
          {
            headers: { Authorization: `Bearer ${liToken}` },
          }
        );

        if (!response.ok) {
          console.warn(`[cron] LinkedIn shareRegistry check failed for post ${postId}:`, response.status);
          continue;
        }

        const liData = await response.json();
        const found = (liData.elements ?? []).some(
          (el: any) => String(el.ownedBy ?? "").includes(postCode)
        );

        if (!found) {
          console.log(`[cron] LinkedIn post ${externalId} no longer exists (post ${postId})`);
          const ppId = (pp as any).id;
          if (ppId) {
            await supabase
              .from("post_platforms")
              .update({ status: "removed_externally", updated_at: now, last_sync_at: now })
              .eq("id", ppId);
            removedIds.push(postId);
          }
        } else {
          console.log(`[cron] LinkedIn post ${externalId} OK for post ${postId}`);
          const ppId = (pp as any).id;
          if (ppId) {
            await supabase
              .from("post_platforms")
              .update({ last_sync_at: now })
              .eq("id", ppId);
          }
        }
      } else {
        // Other platforms — just update last_sync_at
        const ppId = (pp as any).id;
        if (ppId) {
          await supabase
            .from("post_platforms")
            .update({ last_sync_at: now })
            .eq("id", ppId);
        }
      }
    } catch (err) {
      console.error(`[cron] Error syncing post ${postId} (${targetPlatform}):`, err);
    }
  }

  return { success: true, removedIds };
}

/**
 * Cron-safe version of cleanupAutoDeletedPosts for a specific user.
 */
export async function cleanupAutoDeletedPostsForUser(userId: string) {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const { data: posts, error: queryError } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", userId)
    .not("auto_delete_at", "is", null)
    .lt("auto_delete_at", now);

  if (queryError || !posts) {
    console.error("[cron] Error fetching auto-delete posts:", queryError);
    return { success: false, deletedCount: 0 };
  }

  if (posts.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .in("id", posts.map(p => p.id))
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[cron] Error deleting auto-expired posts:", deleteError);
    return { success: false, deletedCount: 0 };
  }

  console.log(`[cron:cleanupAutoDeletedPosts] Deleted ${posts.length} post(s) for user ${userId}`);
  return { success: true, deletedCount: posts.length };
}
