"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  MousePointerClick,
  Bookmark,
  TrendingUp,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagBreakdown, type TagBreakdownData } from "@/components/analytics/tag-breakdown";
import { getTagBreakdown, syncAnalyticsInsights } from "./actions";

type AnalyticsRecord = {
  id: string;
  post_id: string;
  impressions: number;
  engagements: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  saves: number | null;
  recorded_at: string;
};

type PostRecord = {
  id: string;
  content: string;
  created_at: string;
};

type Period = "7" | "30" | "90";

interface AnalyticsDashboardProps {
  analytics: AnalyticsRecord[];
  posts: PostRecord[];
}

const customTooltipStyle: React.CSSProperties = {
  backgroundColor: "#09090b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "10px 14px",
  color: "#e4e4e7",
  backdropFilter: "blur(12px)",
};

export function AnalyticsDashboard({ analytics, posts }: AnalyticsDashboardProps) {
  const t = useTranslations("analytics");
  const [period, setPeriod] = useState<Period>("30");
  const [tagData, setTagData] = useState<TagBreakdownData[]>([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [tagLoading, setTagLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncAnalyticsInsights();
    setSyncing(false);
    if (result.success && result.data) {
      toast.success(
        t.rich("syncSuccess", {
          synced: result.data.synced,
          skipped: result.data.skipped,
          errors: result.data.errors,
        })
      );
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  // Fetch tag breakdown data — re-fetches when period changes
  useEffect(() => {
    let cancelled = false;
    setTagLoading(true);
    getTagBreakdown(parseInt(period)).then((result) => {
      if (!cancelled && result.success && result.data) {
        setTagData(result.data.tags);
        setTagTotal(result.data.total);
      }
    }).finally(() => {
      if (!cancelled) setTagLoading(false);
    });
    return () => { cancelled = true; };
  }, [period]);

  const now = new Date();

  const filteredAnalytics = useMemo(() => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - parseInt(period));
    return analytics.filter((a) => new Date(a.recorded_at) >= cutoff);
  }, [analytics, period]);

  const totals = useMemo(() => {
    return filteredAnalytics.reduce(
      (acc, a) => ({
        impressions: acc.impressions + a.impressions,
        engagements: acc.engagements + a.engagements,
        likes: acc.likes + (a.likes ?? 0),
        comments: acc.comments + (a.comments ?? 0),
        shares: acc.shares + (a.shares ?? 0),
        clicks: acc.clicks + (a.clicks ?? 0),
        saves: acc.saves + (a.saves ?? 0),
      }),
      { impressions: 0, engagements: 0, likes: 0, comments: 0, shares: 0, clicks: 0, saves: 0 }
    );
  }, [filteredAnalytics]);

  const reach = totals.impressions;
  const engagementRate = reach > 0 ? ((totals.engagements / reach) * 100).toFixed(1) : "0.0";

  const dailyData = useMemo(() => {
    const dayMap = new Map<string, AnalyticsRecord>();
    for (const a of filteredAnalytics) {
      const day = a.recorded_at.slice(0, 10);
      const existing = dayMap.get(day);
      if (existing) {
        dayMap.set(day, {
          ...existing,
          impressions: existing.impressions + a.impressions,
          engagements: existing.engagements + a.engagements,
          likes: (existing.likes ?? 0) + (a.likes ?? 0),
          comments: (existing.comments ?? 0) + (a.comments ?? 0),
          shares: (existing.shares ?? 0) + (a.shares ?? 0),
          clicks: (existing.clicks ?? 0) + (a.clicks ?? 0),
          saves: (existing.saves ?? 0) + (a.saves ?? 0),
        } as AnalyticsRecord);
      } else {
        dayMap.set(day, { ...a });
      }
    }
    return Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        impressions: data.impressions,
        engagements: data.engagements,
        likes: data.likes ?? 0,
        comments: data.comments ?? 0,
        shares: data.shares ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAnalytics]);

  const postsWithAnalytics = useMemo(() => {
    const analyticsMap = new Map<string, AnalyticsRecord>();
    for (const a of filteredAnalytics) {
      const existing = analyticsMap.get(a.post_id);
      if (existing) {
        analyticsMap.set(a.post_id, {
          ...existing,
          impressions: existing.impressions + a.impressions,
          engagements: existing.engagements + a.engagements,
          likes: (existing.likes ?? 0) + (a.likes ?? 0),
          comments: (existing.comments ?? 0) + (a.comments ?? 0),
          shares: (existing.shares ?? 0) + (a.shares ?? 0),
          clicks: (existing.clicks ?? 0) + (a.clicks ?? 0),
          saves: (existing.saves ?? 0) + (a.saves ?? 0),
        } as AnalyticsRecord);
      } else {
        analyticsMap.set(a.post_id, { ...a });
      }
    }
    return posts
      .filter((p) => analyticsMap.has(p.id))
      .map((p) => ({
        post: p,
        analytics: analyticsMap.get(p.id),
      }))
      .sort((a, b) => (b.analytics?.impressions || 0) - (a.analytics?.impressions || 0))
      .slice(0, 10);
  }, [posts, filteredAnalytics]);

  const metricCards = [
    {
      label: t("reach"),
      value: reach.toLocaleString(),
      icon: Eye,
      gradient: "from-indigo-500 to-blue-500",
      glowColor: "rgba(99,102,241,0.15)",
    },
    {
      label: t("engagements"),
      value: totals.engagements.toLocaleString(),
      icon: Heart,
      gradient: "from-purple-500 to-pink-500",
      glowColor: "rgba(168,85,247,0.15)",
    },
    {
      label: t("engagementRate"),
      value: `${engagementRate}%`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "rgba(16,185,129,0.15)",
    },
    {
      label: t("totalLikes"),
      value: totals.likes.toLocaleString(),
      icon: MessageCircle,
      gradient: "from-rose-500 to-red-500",
      glowColor: "rgba(244,63,94,0.15)",
    },
    {
      label: t("totalComments"),
      value: totals.comments.toLocaleString(),
      icon: MessageCircle,
      gradient: "from-amber-500 to-orange-500",
      glowColor: "rgba(245,158,11,0.15)",
    },
    {
      label: t("totalShares"),
      value: totals.shares.toLocaleString(),
      icon: Repeat,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "rgba(6,182,212,0.15)",
    },
    {
      label: t("clicks"),
      value: totals.clicks.toLocaleString(),
      icon: MousePointerClick,
      gradient: "from-violet-500 to-purple-500",
      glowColor: "rgba(139,92,246,0.15)",
    },
    {
      label: t("saves"),
      value: totals.saves.toLocaleString(),
      icon: Bookmark,
      gradient: "from-fuchsia-500 to-pink-500",
      glowColor: "rgba(217,70,239,0.15)",
    },
  ];

  const periodLabels = {
    7: t("last7Days"),
    30: t("last30Days"),
    90: t("last3Months"),
  };

  return (
    <div className="relative space-y-6">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      {/* Header */}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-[20px] bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("syncingAnalytics") : t("syncAnalytics")}
        </button>
      </div>

      {/* Period Filter */}
      <div className="relative flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("period")}:</span>
        <div className="flex gap-1 rounded-[20px] bg-white/5 p-1 backdrop-blur-md">
          {(["7", "30", "90"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-[16px] px-3 py-1.5 text-xs font-medium transition-all ${
                period === p
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card
            key={metric.label}
            className="group bg-card/40 backdrop-blur-md border-white/5 rounded-[20px] transition-all duration-300 hover:border-white/10 hover:shadow-lg"
            style={{ boxShadow: `0 0 20px ${metric.glowColor}` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {metric.label}
              </CardTitle>
              <div className={`rounded-full bg-gradient-to-br ${metric.gradient} p-1.5`}>
                <metric.icon className="h-3.5 w-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tighter">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="relative grid gap-6 lg:grid-cols-2">
        {/* Reach & Engagement Over Time - Area Chart */}
        <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("performanceOverTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEngagements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                  />
                  <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    name={t("impressions")}
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#gradImpressions)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagements"
                    name={t("engagements")}
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#gradEngagements)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="likes"
                    name={t("totalLikes")}
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#gradLikes)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage
                label={posts.length === 0 ? t("noPublishedPosts") : t("noAnalyticsYet")}
                showSyncButton={posts.length > 0 && !syncing}
                onSync={handleSync}
                syncing={syncing}
                syncLabel={syncing ? t("syncingAnalytics") : t("syncAnalytics")}
              />
            )}
          </CardContent>
        </Card>

        {/* Likes, Comments, Shares - Bar Chart */}
        <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("engagements")}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <defs>
                    <linearGradient id="barLikes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" />
                      <stop offset="95%" stopColor="#e11d48" />
                    </linearGradient>
                    <linearGradient id="barComments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" />
                      <stop offset="95%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="barShares" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" />
                      <stop offset="95%" stopColor="#0891b2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                  />
                  <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: "12px" }} />
                  <Bar
                    dataKey="likes"
                    name={t("totalLikes")}
                    fill="url(#barLikes)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="comments"
                    name={t("totalComments")}
                    fill="url(#barComments)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="shares"
                    name={t("totalShares")}
                    fill="url(#barShares)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartMessage
                label={posts.length === 0 ? t("noPublishedPosts") : t("noAnalyticsYet")}
                showSyncButton={posts.length > 0 && !syncing}
                onSync={handleSync}
                syncing={syncing}
                syncLabel={syncing ? t("syncingAnalytics") : t("syncAnalytics")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <div className="relative">
        <h2 className="mb-4 text-lg font-semibold">{t("postsPerformance")}</h2>
        {postsWithAnalytics.length === 0 ? (
          <div className="relative">
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full bg-purple-500/20 blur-[100px]" />
            </div>
            <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-3xl" />
                  <BarChart3 className="relative h-16 w-16 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500" />
                </div>
                <p className="text-xl font-medium text-muted-foreground/60">
                  {posts.length === 0 ? t("noPublishedPosts") : t("noAnalyticsYet")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground/40">{t("noDataSubtitle")}</p>
                {posts.length > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="mt-4 inline-flex items-center gap-2 rounded-[20px] bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? t("syncingAnalytics") : t("syncAnalytics")}
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {postsWithAnalytics.map(({ post, analytics: a }) => (
              <Card
                key={post.id}
                className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px] transition-all duration-200 hover:border-white/10"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="line-clamp-2 min-w-0 max-w-xl text-sm">
                      {post.content}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {a?.impressions ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {a?.engagements ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {a?.likes ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {a?.shares ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Posts by Tag Breakdown */}
      <div className="relative">
        <TagBreakdown tags={tagData} total={tagTotal} isLoading={tagLoading} />
      </div>
    </div>
  );
}

function EmptyChartMessage({
  label,
  showSyncButton,
  onSync,
  syncing,
  syncLabel,
}: {
  label: string;
  showSyncButton?: boolean;
  onSync?: () => void;
  syncing?: boolean;
  syncLabel?: string;
}) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground/40">
      {label}
      {showSyncButton && onSync && syncLabel && (
        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-[20px] bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncLabel}
        </button>
      )}
    </div>
  );
}
