"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getValidYouTubeAccessToken } from "@/lib/actions/publish-youtube";

/**
 * Fetch a breakdown of posts by internal tags for the analytics page.
 *
 * Returns an array of `{ tag, count, percentage, statusBreakdown }` sorted by
 * count descending. Limited to top 10 tags; the rest are aggregated into "Other".
 *
 * @param days - number of days to look back (7 | 30 | 90 | undefined = all)
 */
export async function getTagBreakdown(days?: number): Promise<{
  success: boolean;
  data?: {
    tags: {
      id: string;
      name: string;
      color: string;
      count: number;
      percentage: number;
      statusBreakdown: Record<string, number>;
      platformBreakdown: Record<string, number>;
    }[];
    total: number;
  };
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Step 1: Get post_ids created within the time window
  let postQuery = supabase
    .from("posts")
    .select("id, created_at")
    .eq("user_id", user.id);

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    postQuery = postQuery.gte("created_at", cutoff.toISOString());
  }

  const { data: postsInWindow, error: postsErr } = await postQuery;

  if (postsErr || !postsInWindow) {
    return { success: false, error: postsErr?.message ?? "Failed to fetch posts" };
  }

  const postIds = postsInWindow.map((p) => p.id);

  if (postIds.length === 0) {
    return { success: true, data: { tags: [], total: 0 } };
  }

  // Step 2: Get all post_tags for these posts (with tag info via join)
  const { data: postTagRows, error: ptErr } = await supabase
    .from("post_tags")
    .select("post_id, tag_id")
    .eq("user_id", user.id)
    .in("post_id", postIds);

  if (ptErr || !postTagRows) {
    return { success: false, error: ptErr?.message ?? "Failed to fetch post_tags" };
  }

  // Step 3: Get tag details for all unique tag_ids
  const uniqueTagIds = [...new Set(postTagRows.map((r) => r.tag_id))];

  if (uniqueTagIds.length === 0) {
    return { success: true, data: { tags: [], total: 0 } };
  }

  const { data: tagDetails, error: tagsErr } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .in("id", uniqueTagIds);

  if (tagsErr || !tagDetails) {
    return { success: false, error: tagsErr?.message ?? "Failed to fetch tags" };
  }

  const tagMap = new Map(tagDetails.map((t) => [t.id, t]));

  // Step 4: Aggregate counts per tag
  const countMap = new Map<string, number>();
  for (const row of postTagRows) {
    countMap.set(row.tag_id, (countMap.get(row.tag_id) ?? 0) + 1);
  }

  // Total = unique posts that have at least one tag (a post with 2 tags counts once per tag
  // for the tag breakdown, but total is sum of all tag assignments for percentage calc)
  const totalTagAssignments = postTagRows.length;

  // Step 5: Get status + platform breakdown per tag
  // For each tag, get the posts and their post_platforms data
  const tagPostIds = new Map<string, string[]>();
  for (const row of postTagRows) {
    const ids = tagPostIds.get(row.tag_id) ?? [];
    ids.push(row.post_id);
    tagPostIds.set(row.tag_id, ids);
  }

  const statusBreakdowns = new Map<string, Record<string, number>>();
  const platformBreakdowns = new Map<string, Record<string, number>>();

  // Fetch post_platforms for all posts in window (single query).
  // post_platforms has no user_id column — filter by post_ids (already scoped to user above).
  const { data: ppRows, error: ppErr } = await supabase
    .from("post_platforms")
    .select("post_id, status, platform")
    .in("post_id", postIds);

  if (!ppErr && ppRows) {
    // Build lookup: postId → Set<status>, postId → Set<platform>
    const postStatuses = new Map<string, Set<string>>();
    const postPlatforms = new Map<string, Set<string>>();

    for (const pp of ppRows) {
      postStatuses.set(pp.post_id, (postStatuses.get(pp.post_id) ?? new Set()).add(pp.status));
      postPlatforms.set(pp.post_id, (postPlatforms.get(pp.post_id) ?? new Set()).add(pp.platform));
    }

    // Aggregate per tag
    for (const [tagId, ids] of tagPostIds) {
      const statusCounts: Record<string, number> = {};
      const platformCounts: Record<string, number> = {};

      for (const postId of ids) {
        const statuses = postStatuses.get(postId);
        if (statuses) {
          for (const s of statuses) {
            statusCounts[s] = (statusCounts[s] ?? 0) + 1;
          }
        } else {
          statusCounts["draft"] = (statusCounts["draft"] ?? 0) + 1;
        }

        const platforms = postPlatforms.get(postId);
        if (platforms) {
          for (const p of platforms) {
            platformCounts[p] = (platformCounts[p] ?? 0) + 1;
          }
        }
      }

      statusBreakdowns.set(tagId, statusCounts);
      platformBreakdowns.set(tagId, platformCounts);
    }
  }

  // Step 6: Build result array sorted by count desc, top 10 + "Other"
  const entries = [...countMap.entries()]
    .filter(([tagId]) => tagMap.has(tagId)) // only tags that exist
    .sort((a, b) => b[1] - a[1]);

  const topN = 10;
  const topEntries = entries.slice(0, topN);
  const otherCount = entries.slice(topN).reduce((sum, [, c]) => sum + c, 0);

  const resultTags = topEntries.map(([tagId, count]) => {
    const tag = tagMap.get(tagId)!;
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count,
      percentage: totalTagAssignments > 0 ? (count / totalTagAssignments) * 100 : 0,
      statusBreakdown: statusBreakdowns.get(tagId) ?? {},
      platformBreakdown: platformBreakdowns.get(tagId) ?? {},
    };
  });

  if (otherCount > 0) {
    resultTags.push({
      id: "__other__",
      name: "Other", // will be translated in component
      color: "#71717A",
      count: otherCount,
      percentage: totalTagAssignments > 0 ? (otherCount / totalTagAssignments) * 100 : 0,
      statusBreakdown: {},
      platformBreakdown: {},
    });
  }

  return { success: true, data: { tags: resultTags, total: totalTagAssignments } };
}

// ============================================================
// Types
// ============================================================

type AnalyticsMetrics = {
  impressions: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
};

const ZERO_METRICS: AnalyticsMetrics = {
  impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0, saves: 0,
};

type SocialAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  access_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown> | null;
  platform_id: string | null;
};

type PostPlatformRow = {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  external_id: string | null;
  last_sync_at: string | null;
};

// ============================================================
// Orchestrator — syncAnalyticsInsights
// ============================================================

/**
 * Main orchestrator that fetches real analytics from social APIs and
 * upserts them into the `analytics` table. Multi-platform posts have
 * their metrics summed (aggregated) per post_id before upsert.
 */
export async function syncAnalyticsInsights(): Promise<{
  success: boolean;
  data?: { synced: number; skipped: number; errors: number };
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Use admin client for DB writes (bypasses RLS in server actions)
  const admin = createAdminClient();

  // Get this user's post_ids first (post_platforms has no user_id column)
  const { data: userPosts, error: userPostsErr } = await admin
    .from("posts")
    .select("id")
    .eq("user_id", user.id);

  if (userPostsErr || !userPosts) {
    return { success: false, error: userPostsErr?.message ?? "Failed to fetch user posts" };
  }

  const userPostIds = userPosts.map((p) => p.id);
  if (userPostIds.length === 0) {
    return { success: true, data: { synced: 0, skipped: 0, errors: 0 } };
  }

  // B2: Load published post_platforms with external_id for this user's posts
  const { data: ppRows, error: ppErr } = await admin
    .from("post_platforms")
    .select("id, post_id, platform, status, external_id, last_sync_at")
    .in("post_id", userPostIds)
    .eq("status", "published")
    .not("external_id", "is", null);

  if (ppErr || !ppRows) {
    return { success: false, error: ppErr?.message ?? "Failed to fetch post_platforms" };
  }

  if (ppRows.length === 0) {
    return { success: true, data: { synced: 0, skipped: 0, errors: 0 } };
  }

  // Load all social accounts for this user once
  const { data: accounts, error: accErr } = await admin
    .from("social_accounts")
    .select("id, user_id, platform, access_token, token_expires_at, metadata, platform_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (accErr || !accounts) {
    return { success: false, error: accErr?.message ?? "Failed to fetch social accounts" };
  }

  // Build platform → account lookup (use first active account per platform)
  const accountByPlatform = new Map<string, SocialAccountRow>();
  for (const acc of accounts) {
    if (!accountByPlatform.has(acc.platform)) {
      accountByPlatform.set(acc.platform, acc as SocialAccountRow);
    }
  }

  // B3: Throttle — skip items synced < 60 min ago
  const sixtyMinAgo = Date.now() - 60 * 60 * 1000;
  const THROTTLE_MS = 60 * 60 * 1000;

  // Group by post_id so we can aggregate multi-platform metrics
  const groupedByPost = new Map<string, PostPlatformRow[]>();
  for (const row of ppRows) {
    const group = groupedByPost.get(row.post_id) ?? [];
    group.push(row as PostPlatformRow);
    groupedByPost.set(row.post_id, group);
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  // Per-post aggregated metrics (sum across platforms)
  const postAggregated = new Map<string, AnalyticsMetrics>();
  // Track which post_platform rows need last_sync_at update
  const updatedRows = new Set<string>();

  for (const [postId, platformRows] of groupedByPost) {
    let postMetrics: AnalyticsMetrics | null = null;
    let anySynced = false;

    for (const pp of platformRows) {
      // B3: Throttle check
      const lastSyncMs = pp.last_sync_at ? new Date(pp.last_sync_at).getTime() : 0;
      if (Date.now() - lastSyncMs < THROTTLE_MS) {
        skipped++;
        continue;
      }

      // Get access token for this platform
      const account = accountByPlatform.get(pp.platform);
      if (!account || !account.access_token) {
        console.log(`[Analytics] Skipping ${pp.platform} for post ${postId}: no active account or token`);
        skipped++;
        continue;
      }

      // Fetch metrics based on platform
      let metrics: AnalyticsMetrics | null = null;

      try {
        if (pp.platform === "facebook" || pp.platform === "instagram") {
          metrics = await fetchMetaInsights({
            accessToken: account.access_token!,
            externalId: pp.external_id!,
            platform: pp.platform as "facebook" | "instagram",
          });
        } else if (pp.platform === "youtube") {
          metrics = await fetchYouTubeInsights({
            account,
            videoId: pp.external_id!,
          });
        } else if (pp.platform === "twitter") {
          // B6: X placeholder
          console.log(`[Analytics] TODO: X/Twitter insights not implemented — skipping post ${postId}`);
          skipped++;
          continue;
        } else if (pp.platform === "linkedin") {
          // B7: LinkedIn placeholder
          console.log(`[Analytics] TODO: LinkedIn insights not implemented — skipping post ${postId}`);
          skipped++;
          continue;
        } else if (pp.platform === "tiktok") {
          // B8: TikTok placeholder
          console.log(`[Analytics] TODO: TikTok insights not implemented — skipping post ${postId}`);
          skipped++;
          continue;
        }
      } catch (err) {
        console.error(`[Analytics] Error fetching ${pp.platform} for post ${postId}:`, err);
        errors++;
        continue;
      }

      if (!metrics) {
        skipped++;
        continue;
      }

      anySynced = true;

      // Accumulate metrics across platforms (B-requirement: sum for multi-platform posts)
      const existing = postAggregated.get(postId) ?? { ...ZERO_METRICS };
      postAggregated.set(postId, {
        impressions: existing.impressions + metrics.impressions,
        engagements: existing.engagements + metrics.engagements,
        likes: existing.likes + metrics.likes,
        comments: existing.comments + metrics.comments,
        shares: existing.shares + metrics.shares,
        clicks: existing.clicks + metrics.clicks,
        saves: existing.saves + metrics.saves,
      });

      // Track which post_platform rows to update
      updatedRows.add(pp.id);
    }

    if (anySynced) {
      synced++;
    }
  }

  // B9: Upsert aggregated results into analytics table
  const now = new Date().toISOString();
  for (const [postId, metrics] of postAggregated) {
    const { error: upsertErr } = await admin
      .from("analytics")
      .upsert(
        {
          post_id: postId,
          impressions: metrics.impressions,
          engagements: metrics.engagements,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          clicks: metrics.clicks,
          saves: metrics.saves,
          recorded_at: now,
        },
        { onConflict: "post_id" }
      );

    if (upsertErr) {
      console.error(`[Analytics] Upsert failed for post ${postId}:`, upsertErr.message);
      errors++;
    }
  }

  // B10: Update last_sync_at in post_platforms for synced rows
  if (updatedRows.size > 0) {
    const { error: syncUpdateErr } = await admin
      .from("post_platforms")
      .update({ last_sync_at: now })
      .in("id", [...updatedRows]);

    if (syncUpdateErr) {
      console.error("[Analytics] Failed to update last_sync_at:", syncUpdateErr.message);
    }
  }

  return { success: true, data: { synced, skipped, errors } };
}

// ============================================================
// B4 — Meta Graph API fetcher (Facebook + Instagram)
// ============================================================

async function fetchMetaInsights(params: {
  accessToken: string;
  externalId: string;
  platform: "facebook" | "instagram";
}): Promise<AnalyticsMetrics | null> {
  const { accessToken, externalId, platform } = params;

  // Meta Graph API metrics available for both FB pages and IG business accounts
  const metrics = [
    "impressions",
    "engagement",
    "likes_count",
    "comments_count",
    "shares",
    "outbound_clicks",
    "saved_posts",
  ].join(",");

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}/insights?metric=${metrics}&access_token=${accessToken}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) {
      console.warn(`[Analytics] Meta API ${response.status} for ${platform}/${externalId}`);
      return null;
    }

    const body = await response.json();
    const values = body.data ?? [];

    const metricMap = new Map<string, number>();
    for (const item of values) {
      const val = item.value;
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        // Some metrics return [{ metric_name, value }]
        for (const v of val) {
          if (typeof v === "object" && v !== null && "value" in v) {
            const key = (v as Record<string, unknown>).name ?? (v as Record<string, unknown>).metric;
            if (key && typeof (v as Record<string, unknown>).value === "number") {
              metricMap.set(String(key), Number((v as Record<string, unknown>).value));
            }
          }
        }
      } else if (typeof val === "number") {
        // Single numeric value — map by metric name
        const name = item.name;
        if (name) metricMap.set(name, val);
      }
    }

    return {
      impressions: metricMap.get("impressions") ?? 0,
      engagements: metricMap.get("engagement") ?? 0,
      likes: metricMap.get("likes_count") ?? 0,
      comments: metricMap.get("comments_count") ?? 0,
      shares: metricMap.get("shares") ?? 0,
      clicks: metricMap.get("outbound_clicks") ?? 0,
      saves: metricMap.get("saved_posts") ?? 0,
    };
  } catch (err) {
    console.error(`[Analytics] Meta API error for ${platform}/${externalId}:`, err);
    return null;
  }
}

// ============================================================
// B5 — YouTube Data API v3 fetcher
// ============================================================

async function fetchYouTubeInsights(params: {
  account: SocialAccountRow;
  videoId: string;
}): Promise<AnalyticsMetrics | null> {
  const { account, videoId } = params;

  // Get valid (possibly refreshed) access token
  const tokenResult = await getValidYouTubeAccessToken({ account });
  if (!tokenResult.success || !tokenResult.accessToken) {
    console.warn(`[Analytics] YouTube token error: ${(tokenResult as { error: string }).error}`);
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&maxResults=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[Analytics] YouTube API ${response.status} for video ${videoId}`);
      return null;
    }

    const body = await response.json();
    const item = body.items?.[0];
    const stats = item?.statistics ?? {};

    return {
      impressions: Number(stats.viewCount ?? 0),
      engagements: 0, // YouTube doesn't have a direct "engagement" metric in this endpoint
      likes: Number(stats.likeCount ?? 0),
      comments: Number(stats.commentCount ?? 0),
      shares: 0, // Not available via YouTube Data API v3
      clicks: 0,
      saves: 0,
    };
  } catch (err) {
    console.error(`[Analytics] YouTube API error for video ${videoId}:`, err);
    return null;
  }
}
