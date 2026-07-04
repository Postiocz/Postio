"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { PostStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Link as LinkIcon,
  Copy,
  Plus,
  ArrowRight,
  Crown,
  Sparkles,
  Flame,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  TopLabelsChart,
  type TopLabelItem,
} from "@/components/dashboard/top-labels-chart";
import {
  PlatformDonutChart,
  type PlatformDatum,
} from "@/components/dashboard/platform-donut-chart";
import {
  aggregateTopLabels,
  aggregatePlatforms,
  prioritizeForDonut,
  calculateStreak,
  calculateTrend,
} from "@/lib/dashboard-stats";
import { normalizePost } from "./posts/normalize-post";

type RecentPostItem = {
  id: string;
  content: string;
  created_at: string;
  status: PostStatus;
};

type RecentPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  post_platforms:
    | Array<{ platform: string; status: PostStatus }>
    | null;
};

type PostTagJoinRow = {
  tag_id: string;
  tags:
    | { id: string; name: string; color: string }
    | Array<{ id: string; name: string; color: string }>
    | null;
};

type PublishedPlatformRow = {
  platform: string;
  published_at: string | null;
};

type CreatedAtRow = {
  created_at: string | null;
};

function buildRecentPostPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalPosts: 0,
    scheduledPosts: 0,
    draftPosts: 0,
    recentPosts: [],
    connectedAccounts: 0,
    streak: 0,
    currentPlan: "free",
    consistencyScore: 0,
    topLabels: [],
    platformData: [],
    publishedTotal: 0,
    weeklyTrend: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      try {
        await params;
        if (cancelled) return;

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setData({
            totalPosts: 0,
            scheduledPosts: 0,
            draftPosts: 0,
            recentPosts: [],
            connectedAccounts: 0,
            streak: 0,
            currentPlan: "free",
            consistencyScore: 0,
            topLabels: [],
            platformData: [],
            publishedTotal: 0,
            weeklyTrend: 0,
          });
          return;
        }

        // Paralelní načtení všech dat potřebných pro dashboard.
        // Každý dotaz je nezávislý – využíváme Promise.all pro minimální latenci.
        //
        // DŮLEŽITÉ pro RLS:
        // - `posts`, `social_accounts`, `users`, `post_tags` mají přímý `user_id`,
        //   filtrují se jednoduše přes `.eq("user_id", user.id)`.
        // - `post_platforms` (migrace 023) NEMÁ `user_id` – RLS filtruje přes
        //   JOIN na `posts.user_id`. Proto používáme `posts!inner(user_id)`
        //   v selectu + `.eq("posts.user_id", user.id)`. Tím Supabase vnutil
        //   INNER JOIN a data jsou správně izolovaná.
        const [
          postsData,
          scheduledData,
          draftData,
          accountsData,
          userData,
          recentPostsRows,
          postTagsRows,
          publishedPlatformsRows,
          postCreatedAtRows,
        ] = await Promise.all([
          // 1. Celkový počet příspěvků.
          supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          // 2. Naplánované příspěvky (přes post_platforms – inner JOIN kvůli RLS).
          supabase
            .from("post_platforms")
            .select("post_id, posts!inner(user_id)", {
              count: "exact",
              head: true,
            })
            .eq("posts.user_id", user.id)
            .eq("status", "scheduled"),
          // 2b. Rozepsané příspěvky (draft).
          supabase
            .from("post_platforms")
            .select("post_id, posts!inner(user_id)", {
              count: "exact",
              head: true,
            })
            .eq("posts.user_id", user.id)
            .eq("status", "draft"),
          // 3. Aktivní sociální účty.
          supabase
            .from("social_accounts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_active", true),
          // 4. User profil (streak + plán).
          supabase
            .from("users")
            .select("streak, plan")
            .eq("id", user.id)
            .single(),
          // 4b. Poslední příspěvky (max 5, seřazeno podle created_at).
          supabase
            .from("posts")
            .select("id, content, created_at, post_platforms(platform, status)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
          // 5. Top štítky: post_tags JOIN tags. Filtrujeme přes user_id (RLS).
          supabase
            .from("post_tags")
            .select("tag_id, tags(id, name, color)")
            .eq("user_id", user.id),
          // 6. Publikované záznamy pro donut chart (inner JOIN kvůli RLS).
          supabase
            .from("post_platforms")
            .select("platform, published_at, post_id, posts!inner(user_id)")
            .eq("posts.user_id", user.id)
            .eq("status", "published"),
          // 7. Datumy vytvoření všech postů – pro trend indikátor.
          supabase.from("posts").select("created_at").eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const totalPosts = postsData.count ?? 0;
        const scheduledPosts = scheduledData.count ?? 0;
        const draftPosts = draftData.count ?? 0;
        const recentPosts = ((recentPostsRows.data ?? []) as RecentPostRow[]).map(
          (post) => {
            const normalized = normalizePost({
              id: post.id,
              content: post.content ?? "",
              created_at: post.created_at,
              post_platforms: post.post_platforms ?? [],
            } as Record<string, unknown>);

            return {
              id: normalized.id,
              content: normalized.content,
              created_at: normalized.created_at,
              status: normalized.status,
            };
          },
        );
        const connectedAccounts = accountsData.count ?? 0;
        const dbStreak = userData.data?.streak ?? 0;
        const currentPlan = userData.data?.plan ?? "free";

        // Top štítky (agregace z post_tags + tags).
        let topLabels: TopLabelItem[] = [];
        if (postTagsRows.data) {
          topLabels = aggregateTopLabels(
            (postTagsRows.data as PostTagJoinRow[]).map((r) => ({
              tag_id: r.tag_id,
              tags: Array.isArray(r.tags) ? (r.tags[0] ?? null) : r.tags,
            })),
          );
        }

        // Platformy donut chart.
        let platformData: PlatformDatum[] = [];
        let publishedTotal = 0;
        let streak = 0;
        let consistencyScore = 0;

        if (publishedPlatformsRows.data) {
          const platformsData = publishedPlatformsRows.data as PublishedPlatformRow[];
          platformData = prioritizeForDonut(
            aggregatePlatforms(platformsData),
          );
          publishedTotal = platformsData.length;

          // Streak – preferujeme dynamický výpočet (úkol: "musí být funkční").
          // Vypočítáme z publikovaných datumů; pokud výpočet > 0, použijeme ho,
          // jinak fallback na DB hodnotu (kterou aktualizuje cron job).
          const publishedDates = platformsData
            .map((r) => r.published_at)
            .filter((d): d is string => Boolean(d));
          const calculatedStreak = calculateStreak(publishedDates);
          streak = calculatedStreak > 0 ? calculatedStreak : dbStreak;

          // Consistency score – procentuální podíl dní s publikací v posledních 30 dnech.
          // Pouze pokud má uživatel alespoň 3 publikace – jinak je skóre 0.
          if (publishedPlatformsRows.data.length >= 3) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const totalDays = 30;
            const daysWithPublish = new Set<string>();
            for (const pubDate of publishedDates) {
              const d = new Date(pubDate);
              if (d >= thirtyDaysAgo && d <= new Date()) {
                daysWithPublish.add(d.toISOString().slice(0, 10));
              }
            }
            consistencyScore = Math.round(
              (daysWithPublish.size / totalDays) * 100,
            );
          }
        }

        // Trend za posledních 7 dní.
        let weeklyTrend = 0;
        if (postCreatedAtRows.data) {
          weeklyTrend = calculateTrend(
            (postCreatedAtRows.data as CreatedAtRow[]).map((r) => r.created_at),
          );
        }

        setData({
          totalPosts,
          scheduledPosts,
          draftPosts,
          recentPosts,
          connectedAccounts,
          streak,
          currentPlan,
          consistencyScore,
          topLabels,
          platformData,
          publishedTotal,
          weeklyTrend,
        });
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        // Partial data may be available – don't reset to zero
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboardData();

    // Automatický refresh po focusu okna (např. po návratu z create/edit postu)
    const handleFocus = () => {
      if (!cancelled) {
        fetchDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Načítám dashboard...</div>
      </div>
    );
  }

  return <DashboardContent params={params} data={data} />;
}

interface DashboardData {
  totalPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  recentPosts: RecentPostItem[];
  connectedAccounts: number;
  streak: number;
  currentPlan: string;
  consistencyScore: number;
  topLabels: TopLabelItem[];
  platformData: PlatformDatum[];
  publishedTotal: number;
  weeklyTrend: number;
}

function DashboardContent({
  params,
  data,
}: {
  params: Promise<{ locale: string }>;
  data: DashboardData;
}) {
  const { locale } = use(params);
  const t = useTranslations("dashboard");
  const postsT = useTranslations("posts");
  const navT = useTranslations("nav");
  const settingsT = useTranslations("settings");
  const recentPostStatusLabels: Partial<Record<PostStatus, string>> = {
    draft: postsT("statusDraft"),
    scheduled: postsT("statusScheduled"),
    published: postsT("statusPublished"),
    failed: postsT("statusFailed"),
    removed_externally: postsT("statusRemovedExternally"),
    archived: postsT("statusArchived"),
  };

  return (
    <div className="space-y-8">
      {data.totalPosts === 0 && data.scheduledPosts === 0 && data.connectedAccounts === 0 && data.streak === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-card/20 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">{t("emptyStateTitle")}</h2>
          <p className="mb-6 text-muted-foreground">{t("emptyStateDescription")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href={`/${locale}/posts/new`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createFirstPost")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/accounts`}>
                <LinkIcon className="mr-2 h-4 w-4" />
                {t("connectAccount")}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground/60">{t("subtitle")}</p>
          </div>

          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalPosts")}
          value={data.totalPosts}
          icon={FileText}
          href={`/${locale}/posts`}
          trend={{
            value: data.weeklyTrend,
            label: t("thisWeek"),
          }}
        />
        <StatCard
          title={t("scheduled")}
          value={data.scheduledPosts}
          icon={CalendarIcon}
          href={`/${locale}/calendar`}
          subtitle={data.draftPosts > 0 ? (
          data.draftPosts === 1
            ? t("oneDraft")
            : data.draftPosts >= 2 && data.draftPosts <= 4
              ? t("fewDrafts", { count: data.draftPosts })
              : t("manyDrafts", { count: data.draftPosts })
        ) : undefined}
        />
        <StatCard
          title={t("connectedAccounts")}
          value={data.connectedAccounts}
          icon={LinkIcon}
          href={`/${locale}/accounts`}
        />
        <StatCard
          title={t("streak")}
          value={`${data.streak}d`}
          icon={Flame}
          href={`/${locale}/analytics`}
          isGlowing={data.streak > 0}
          subtitle={data.streak === 0 ? t("streakEmpty") : undefined}
        />
      </div>

      {/* Analytics row – grafy: konzistence + donut + top labels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ConsistencyScore
          score={data.consistencyScore}
          label={t("consistencyScore")}
          t={t}
        />
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <PlatformDonutChart
            data={data.platformData}
            total={data.publishedTotal}
            translations={{
              title: t("platformBreakdown"),
              emptyTitle: t("platformEmptyTitle"),
              emptyDescription: t("platformEmptyDescription"),
              published: t("published"),
            }}
          />
          <TopLabelsChart
            labels={data.topLabels}
            locale={locale}
            translations={{
              title: t("topLabels"),
              emptyTitle: t("labelsEmptyTitle"),
              emptyDescription: t("labelsEmptyDescription"),
              emptyAction: t("labelsEmptyAction"),
              posts: t("postsCount"),
            }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("quickActions")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <QuickActionCard
            title={t("newPost")}
            description={t("newPostDescription")}
            href={`/${locale}/posts/new`}
            icon={Plus}
            emphasis="primary"
          />
          <QuickActionCard
            title={navT("templates")}
            description={t("browseTemplates")}
            href={`/${locale}/templates`}
            icon={Copy}
          />
          <QuickActionCard
            title={navT("analytics")}
            description={t("viewAnalytics")}
            href={`/${locale}/analytics`}
            icon={BarChart3}
          />
        </div>
      </div>

   {data.recentPosts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("recentPosts")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}/posts`}>
                {t("viewAll")}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentPosts.map((post) => (
              <Card
                key={post.id}
                className="bg-card/40 backdrop-blur-md border-white/5 hover:bg-accent transition-all cursor-pointer"
              >
                <CardContent className="p-4">
                  <Link href={`/${locale}/posts/${post.id}`}>
                    <h3 className="font-medium line-clamp-2 mb-2">
                      {buildRecentPostPreview(post.content) || postsT("newPost")}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(post.created_at).toLocaleDateString(locale)}</span>
                      <Badge
                        variant="outline"
                        className={
                          post.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : post.status === "scheduled"
                              ? "bg-blue-500/10 text-blue-400"
                              : post.status === "failed"
                                ? "bg-red-500/10 text-red-400"
                                : post.status === "removed_externally"
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "bg-gray-500/10 text-gray-400"
                        }
                      >
                        {recentPostStatusLabels[post.status] ?? post.status}
                      </Badge>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <UpgradeBanner
        locale={locale}
        currentPlan={data.currentPlan}
        t={t}
        settingsT={settingsT}
      />
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  isGlowing = false,
  trend,
  subtitle,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isGlowing?: boolean;
  trend?: { value: number; label: string };
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-3 w-3 text-muted-foreground/40",
            isGlowing &&
              "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]",
          )}
        />
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-between">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-muted-foreground/60">
            {subtitle}
          </div>
        )}
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend.value > 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="font-semibold text-emerald-400 tabular-nums">
                  +{trend.value}
                </span>
                <span className="text-muted-foreground/70">{trend.label}</span>
              </>
            ) : trend.value < 0 ? (
              <>
                <TrendingDown className="h-3 w-3 text-rose-400" />
                <span className="font-semibold text-rose-400 tabular-nums">
                  {trend.value}
                </span>
                <span className="text-muted-foreground/70">{trend.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground/60">— {trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group h-full">
        <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px] transition-all hover:bg-accent hover:shadow-md hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px] h-full flex flex-col">{content}</Card>;
}

function ConsistencyScore({
  score,
  label,
  t,
}: {
  score: number;
  label: string;
  t: (key: string) => string;
}) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
      <CardContent className="flex items-center gap-6 p-6">
        <div className="relative flex-shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/10"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#consistencyGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient
                id="consistencyGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold tracking-tight">{score}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60">
            {score >= 80
              ? t("consistencyExcellent")
              : score >= 50
                ? t("consistencyGood")
                : t("consistencyImprove")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  emphasis = "secondary",
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  emphasis?: "primary" | "secondary";
}) {
  const isPrimary = emphasis === "primary";

  return (
    <Link href={href}>
      <Button
        variant={isPrimary ? "default" : "outline"}
        className={
          "group flex h-auto w-full flex-col items-start gap-3 rounded-[20px] p-6 text-left transition-all " +
          (isPrimary
            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:opacity-90 hover:shadow-xl"
            : "bg-card/40 backdrop-blur-md border-white/5 hover:bg-accent hover:shadow-md hover:-translate-y-0.5")
        }
      >
        <Icon
          className={isPrimary ? "h-6 w-6 text-white" : "h-6 w-6 text-primary"}
        />
        <div className="text-left">
          <div className="text-base font-semibold">{title}</div>
          <div
            className={
              isPrimary ? "text-sm text-white/80" : "text-sm text-foreground/70"
            }
          >
            {description}
          </div>
        </div>
      </Button>
    </Link>
  );
}

function UpgradeBanner({
  locale,
  currentPlan,
  t,
  settingsT,
}: {
  locale: string;
  currentPlan: string;
  t: (key: string) => string;
  settingsT: (key: string) => string;
}) {
  const planLabel =
    currentPlan === "pro"
      ? t("planPro")
      : currentPlan === "creator"
        ? t("planCreator")
        : t("free");

  return (
    <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border">
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30" />
      <CardContent className="relative p-4 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <Sparkles className="h-5 w-5 text-primary/70" />
              <h3 className="text-lg font-semibold sm:text-xl">
                {t("proCtaTitle")}
              </h3>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("proCtaSubtitle")}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t("currentPlan")}
              </span>
              <Badge
                variant={
                  currentPlan === "pro"
                    ? "default"
                    : currentPlan === "creator"
                      ? "secondary"
                      : "outline"
                }
              >
                {planLabel}
              </Badge>
            </div>
          </div>

          <Button asChild className="gap-2 sm:self-center">
            <Link href={`/${locale}/settings`}>
              {currentPlan === "pro" ? settingsT("upgrade") : t("proCtaButton")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
