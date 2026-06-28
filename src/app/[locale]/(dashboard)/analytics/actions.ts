"use server";

import { createClient } from "@/lib/supabase/server";

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

  // Fetch post_platforms for all posts in window (single query)
  const { data: ppRows, error: ppErr } = await supabase
    .from("post_platforms")
    .select("post_id, status, platform")
    .eq("user_id", user.id)
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

export async function generateDemoAnalytics() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const now = new Date();
  const demoPosts = [];

  for (let i = 0; i < 30; i++) {
    const postDate = new Date(now);
    postDate.setDate(postDate.getDate() - Math.floor(Math.random() * 90));

    const platforms = [["instagram"], ["facebook"], ["twitter"], ["linkedin"]][Math.floor(Math.random() * 4)];

    demoPosts.push({
      user_id: user.id,
      content: `Demo post ${i + 1}`,
      media_urls: [],
      platforms,
      scheduled_at: postDate.toISOString(),
      status: "published" as const,
      published_at: postDate.toISOString(),
      created_at: postDate.toISOString(),
      updated_at: postDate.toISOString(),
    });
  }

  const { data: insertedPosts, error: postsError } = await supabase
    .from("posts")
    .insert(demoPosts)
    .select("id");

  if (postsError) {
    console.error("Error inserting demo posts:", JSON.stringify(postsError, null, 2));
    return { success: false, error: postsError.message || "Unknown posts error" };
  }

  const insertedPostIds = (insertedPosts as any[] | undefined)?.map((p: { id: string }) => p.id) ?? [];

  if (insertedPostIds.length === 0) {
    return { success: false, error: "No posts were inserted" };
  }

  const demoAnalytics = insertedPostIds.map((postId: string) => {
    const postDate = new Date(now);
    postDate.setDate(postDate.getDate() - Math.floor(Math.random() * 90));

    const impressions = Math.floor(Math.random() * 5000) + 500;
    const engagements = Math.floor(impressions * (Math.random() * 0.08 + 0.02));
    const likes = Math.floor(engagements * (Math.random() * 0.5 + 0.3));
    const comments = Math.floor(engagements * (Math.random() * 0.2 + 0.05));
    const shares = Math.floor(engagements * (Math.random() * 0.15 + 0.02));
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.005));
    const saves = Math.floor(engagements * (Math.random() * 0.1 + 0.01));

    return {
      post_id: postId,
      impressions,
      engagements,
      likes,
      comments,
      shares,
      clicks,
      saves,
      recorded_at: postDate.toISOString(),
    };
  });

  // Try insert with detailed metrics first
  let { error: analyticsError } = await supabase.from("analytics").insert(demoAnalytics);

  // Fallback: if detailed columns don't exist, insert with basic metrics only
  if (analyticsError) {
    console.warn("Detailed analytics insert failed, trying basic insert:", JSON.stringify(analyticsError, null, 2));
    const basicAnalytics = demoAnalytics.map((a) => ({
      post_id: a.post_id,
      impressions: a.impressions,
      engagements: a.engagements,
      recorded_at: a.recorded_at,
    }));
    const { error: basicError } = await supabase.from("analytics").insert(basicAnalytics);
    if (basicError) {
      console.error("Error inserting demo analytics (basic):", JSON.stringify(basicError, null, 2));
      return { success: false, error: basicError.message || "Unknown analytics error" };
    }
  }

  return { success: true };
}
