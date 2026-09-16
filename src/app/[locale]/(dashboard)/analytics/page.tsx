import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard, type PostTarget } from "./analytics-dashboard";

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

  // Fetch post_platforms targets for these posts (platform + joined account
  // info). Analytics rows are keyed by post_platform_id, so the drill-down
  // (KROK C) needs these target rows to label each metric breakdown.
  const postPlatforms: PostTarget[] = [];
  if (postIds.length > 0) {
    const { data: ppRows, error: ppError } = await supabase
      .from("post_platforms")
      .select("id, post_id, platform, account_id, social_accounts(account_name, avatar_url)")
      .in("post_id", postIds);

    if (!ppError && ppRows) {
      postPlatforms.push(
        ...ppRows.map((pp: Record<string, unknown>) => {
          const socialAccounts = (pp as { social_accounts?: unknown }).social_accounts;
          const sa = Array.isArray(socialAccounts) ? socialAccounts[0] : socialAccounts;
          return {
            id: String(pp.id),
            post_id: String(pp.post_id),
            platform: String(pp.platform),
            account_id: pp.account_id ? String(pp.account_id) : null,
            account_name: sa && typeof sa === "object" && "account_name" in sa ? String((sa as { account_name: unknown }).account_name) : null,
            avatar_url: sa && typeof sa === "object" && "avatar_url" in sa && (sa as { avatar_url: unknown }).avatar_url
              ? String((sa as { avatar_url: unknown }).avatar_url)
              : null,
          } as PostTarget;
        })
      );
    }
  }

  return (
    <AnalyticsDashboard
      analytics={analyticsRecords}
      posts={posts || []}
      postPlatforms={postPlatforms}
    />
  );
}
