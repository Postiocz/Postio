import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "./analytics-dashboard";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  await getTranslations({ locale, namespace: "analytics" });

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return <div className="text-muted-foreground">Must be logged in.</div>;
  }

  // Read period from URL search params (default: 90 days, same as analytics-dashboard.tsx)
  const resolvedSearchParams = await searchParams;
  const period = typeof resolvedSearchParams.period === "string" ? resolvedSearchParams.period : "90";
  const days = parseInt(period);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Fetch published posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    return <div className="text-muted-foreground">Error loading posts.</div>;
  }

  // Fetch analytics records for this user's posts, server-side filtered by period.
  // Per-target model (migration 060/061): returns ALL post_platform_id rows for these posts.
  const postIds = (posts || []).map((p: { id: string }) => p.id);
  let analyticsRecords: any[] = [];

  if (postIds.length > 0) {
    const { data: analytics, error: analyticsError } = await supabase
      .from("analytics")
      .select("*")
      .in("post_id", postIds)
      .gte("recorded_at", cutoff.toISOString());

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
