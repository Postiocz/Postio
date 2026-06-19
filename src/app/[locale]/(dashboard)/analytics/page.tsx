import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { generateDemoAnalytics } from "./actions";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await getTranslations({ locale, namespace: "analytics" });

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return <div className="text-muted-foreground">Must be logged in.</div>;
  }

  // Fetch published posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, platforms, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    return <div className="text-muted-foreground">Error loading posts.</div>;
  }

  // Fetch analytics records
  const postIds = (posts || []).map((p: { id: string }) => p.id);
  let analyticsRecords: any[] = [];

  if (postIds.length > 0) {
    const { data: analytics, error: analyticsError } = await supabase
      .from("analytics")
      .select("*")
      .in("post_id", postIds);

    if (!analyticsError && analytics) {
      analyticsRecords = analytics;
    }
  }

  // Auto-generate demo data if both posts and analytics are empty
  if ((posts || []).length === 0 || analyticsRecords.length === 0) {
    await generateDemoAnalytics();

    const { data: refreshedPosts } = await supabase
      .from("posts")
      .select("id, content, platforms, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const refreshedIds = (refreshedPosts || []).map((p: { id: string }) => p.id);
    if (refreshedIds.length > 0) {
      const { data: refreshedAnalytics } = await supabase
        .from("analytics")
        .select("*")
        .in("post_id", refreshedIds);

      if (refreshedAnalytics) {
        analyticsRecords = refreshedAnalytics;
      }
    }
    if (refreshedPosts) {
      posts?.unshift(...refreshedPosts.filter((n: { id: string }) => !postIds.includes(n.id)));
    }
  }

  return (
    <AnalyticsDashboard
      analytics={analyticsRecords}
      posts={posts || []}
    />
  );
}
