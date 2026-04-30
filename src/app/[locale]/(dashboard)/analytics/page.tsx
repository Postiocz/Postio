import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { type Database } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Eye, Heart } from "lucide-react";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "analytics" });
  const supabase = await createClient();

  // Fetch posts with analytics
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, status, created_at, platforms")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch analytics for each post
  const postIds = (posts || []).map((p: { id: string }) => p.id);
  const { data: analytics } = postIds.length > 0
    ? await supabase.from("analytics").select("*").in("post_id", postIds)
    : { data: [] };

  // Calculate totals
  const totalImpressions = (analytics || []).reduce(
    (sum: number, a: { impressions: number }) => sum + a.impressions, 0
  );
  const totalEngagements = (analytics || []).reduce(
    (sum: number, a: { engagements: number }) => sum + a.engagements, 0
  );

  // Build a map for quick lookup
  const analyticsMap = new Map<
    string,
    { post_id: string; impressions: number; engagements: number } | undefined
  >();
  (analytics || []).forEach((a: { post_id: string; impressions: number; engagements: number }) =>
    analyticsMap.set(a.post_id, a)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("noData")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("impressions")}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("engagements")}
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEngagements.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalImpressions > 0
                ? ((totalEngagements / totalImpressions) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-post analytics */}
      <h2 className="text-lg font-semibold">Post Performance</h2>
      {posts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noData")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(posts || []).map((post: { id: string; content: string }) => {
            const analyticsData = analyticsMap.get(post.id);
            return (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="line-clamp-1 max-w-md text-sm">
                      {post.content}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {analyticsData?.impressions ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {analyticsData?.engagements ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
