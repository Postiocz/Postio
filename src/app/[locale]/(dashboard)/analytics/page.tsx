import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "./analytics-dashboard";

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
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    return <div className="text-muted-foreground">Error loading posts.</div>;
  }

  // Fetch analytics records for this user's posts
  const postIds = (posts || []).map((p: { id: string }) => p.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return (
    <AnalyticsDashboard
      analytics={analyticsRecords}
      posts={posts || []}
    />
  );
}
