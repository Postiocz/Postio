"use server";

import { createClient } from "@/lib/supabase/server";

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
