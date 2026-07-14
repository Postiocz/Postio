"use client";

import { useState, useEffect, useCallback } from "react";
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
  Check,
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
  Clock,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Instagram,
  Facebook,
  Linkedin,
  XIcon,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";
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
import { normalizePost } from "../posts/normalize-post";
import { markAsPublishedManual } from "@/lib/actions/publish";
import {
  PreviewDialog,
  type PreviewPostData,
  type PreviewPostPlatform,
} from "@/components/preview-dialog";

type RecentPostItem = {
  id: string;
  content: string;
  created_at: string;
  status: PostStatus;
  scheduled_at: string | null;
  platforms: string[];
  media_urls: string[];
  post_tags: { id: string; name: string; color: string }[];
  post_platforms_raw: PreviewPostPlatform[];
};

type RecentPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  media_urls: string[] | null;
  post_platforms:
    | Array<{
        id: string;
        platform: string;
        status: PostStatus;
        scheduled_at: string | null;
        published_at: string | null;
        external_id: string | null;
        publish_error: string | null;
        post_id: string;
        created_at: string;
        updated_at: string;
      }>
    | null;
  post_tags: PostTagJoinRow[] | null;
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

// "K vyřízení" – manuální X příspěvky (Prompt 031-X, Krok 3).
type TodoPostItem = {
  id: string;
  postId: string;
  accountId: string | null;
  platform: string;
  scheduled_at: string | null;
  content: string;
  media_urls: string[];
};

type TodoPostRow = {
  id: string;
  platform: string;
  scheduled_at: string | null;
  account_id: string | null;
  posts:
    | { id: string; content: string | null; media_urls: string[] | null }
    | Array<{ id: string; content: string | null; media_urls: string[] | null }>
    | null;
};

function buildRecentPostPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}

// Platform icon map — mirrors the one in posts/_post-card.tsx.
const platformIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: XIcon,
  x: XIcon,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

// Detects a video URL by extension (same pattern as _post-card.tsx).
function isVideoUrl(url: string) {
  return /\.(mp4|mov)(\?.*)?$/i.test(url);
}

// Formats a timestamp as a localized relative time (e.g. "2 h ago").
// Falls back to an absolute date for spans older than ~30 days.
function formatRelativeTime(dateStr: string, locale: string, now: number) {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - now;
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const minute = 60;
  const hour = 3600;
  const day = 86400;

  if (absSec < minute) return rtf.format(diffSec, "second");
  if (absSec < hour) return rtf.format(Math.round(diffSec / minute), "minute");
  if (absSec < day) return rtf.format(Math.round(diffSec / hour), "hour");
  if (absSec < day * 30) return rtf.format(Math.round(diffSec / day), "day");
  return new Date(dateStr).toLocaleDateString(locale);
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
    userId: null,
    todoPosts: [],
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
            userId: null,
            todoPosts: [],
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
          todoRows,
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
            .select(
              "id, content, created_at, media_urls, post_platforms(id, platform, status, scheduled_at, published_at, external_id, publish_error, post_id, created_at, updated_at), post_tags(tags(id, name, color))",
            )
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
          // 8. "K vyřízení" – manuální X příspěvky (status 'ready' pro twitter).
          // Hybridní X režim (Prompt 031-X, Krok 3): scheduler tyto řádky
          // nezveřejnil přes API, ale označil je k ručnímu vyřízení.
          supabase
            .from("post_platforms")
            .select(
              "id, platform, scheduled_at, account_id, posts!inner(id, content, media_urls)",
            )
            .eq("posts.user_id", user.id)
            .eq("status", "ready")
            .ilike("platform", "twitter"),
        ]);

        if (cancelled) return;

        const totalPosts = postsData.count ?? 0;
        const scheduledPosts = scheduledData.count ?? 0;
        const draftPosts = draftData.count ?? 0;
        const recentPosts = ((recentPostsRows.data ?? []) as RecentPostRow[]).map(
          (post) => {
            const platformRows = post.post_platforms ?? [];
            // scheduled_at lives on post_platforms, not posts — take the
            // earliest scheduled time across this post's platforms.
            const scheduledAt =
              platformRows
                .map((p) => p.scheduled_at)
                .filter((s): s is string => Boolean(s))
                .sort()[0] ?? null;
            const normalized = normalizePost({
              id: post.id,
              content: post.content ?? "",
              created_at: post.created_at,
              media_urls: post.media_urls ?? [],
              post_platforms: platformRows,
              post_tags: post.post_tags ?? [],
            } as Record<string, unknown>);

            return {
              id: normalized.id,
              content: normalized.content,
              created_at: normalized.created_at,
              status: normalized.status,
              scheduled_at: scheduledAt,
              platforms: normalized.platforms,
              media_urls: normalized.media_urls,
              post_tags: normalized.post_tags,
              post_platforms_raw: platformRows as PreviewPostPlatform[],
            };
          },
        );
        const connectedAccounts = accountsData.count ?? 0;

        // "K vyřízení" – manuální X příspěvky k ručnímu zveřejnění.
        const todoPosts: TodoPostItem[] = (
          (todoRows.data ?? []) as TodoPostRow[]
        ).map((row) => {
          const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
          return {
            id: row.id,
            postId: post?.id ?? "",
            accountId: row.account_id,
            platform: row.platform,
            scheduled_at: row.scheduled_at,
            content: post?.content ?? "",
            media_urls: post?.media_urls ?? [],
          };
        });
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
          userId: user.id,
          todoPosts,
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
  userId: string | null;
  todoPosts: TodoPostItem[];
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
  // Timestamp captured once on mount — keeps relative-time rendering pure.
  const [nowTs] = useState(() => Date.now());
  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<PreviewPostData | null>(null);
  // "K vyřízení" – který manuální X příspěvek má zkopírovaný text.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // "K vyřízení" – id post_platforms řádků už označených jako publikované
  // (optimistické skrytí karty bez čekání na re-fetch).
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleCopyText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. non-secure context) – ignore.
    }
  }, []);

  // Hybridní X režim (Prompt 031-X-COMBO, Krok 2): uživatel ručně zveřejnil
  // X příspěvek a odebírá ho ze sekce „K vyřízení".
  const handleMarkPublished = useCallback(async (todo: TodoPostItem) => {
    setMarkingId(todo.id);
    try {
      const res = await markAsPublishedManual({
        postId: todo.postId,
        platform: todo.platform,
        accountId: todo.accountId ?? undefined,
      });
      if (res.success) {
        // Optimisticky skryjeme kartu – při dalším focusu se seznam obnoví.
        setMarkedIds((prev) => new Set(prev).add(todo.id));
      }
    } finally {
      setMarkingId(null);
    }
  }, []);

  const openPreview = useCallback((post: RecentPostItem) => {
    setPreviewPost({
      id: post.id,
      content: post.content,
      platforms: post.platforms,
      post_platforms: post.post_platforms_raw,
      scheduled_at: post.scheduled_at,
      status: post.status,
      location: null,
      tags: post.post_tags.map((t) => t.name),
      media_urls: post.media_urls,
    });
    setPreviewOpen(true);
  }, []);
  const recentPostStatusLabels: Partial<Record<PostStatus, string>> = {
    draft: postsT("statusDraft"),
    scheduled: postsT("statusScheduled"),
    publishing: postsT("statusPublishing"),
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.recentPosts.map((post) => {
              const preview =
                buildRecentPostPreview(post.content) || postsT("newPost");
              const primaryMedia = post.media_urls[0] ?? null;
              const extraMedia = post.media_urls.length - 1;
              const visibleTags = post.post_tags.slice(0, 2);
              const extraTags = post.post_tags.length - 2;
              const timeLabel =
                post.status === "scheduled" && post.scheduled_at
                  ? t("scheduledFor", {
                      date: new Date(post.scheduled_at).toLocaleDateString(
                        locale,
                      ),
                    })
                  : formatRelativeTime(post.created_at, locale, nowTs);

              return (
                <div
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(post)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openPreview(post);
                    }
                  }}
                  className="group block cursor-pointer"
                >
                  <Card className="h-full bg-card/40 backdrop-blur-md border-white/5 group-hover:bg-accent transition-all">
                    <CardContent className="flex h-full flex-col gap-3 p-3.5">
                      {/* Top row: platform icons + status badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {post.post_platforms_raw.length > 0 ? (
                            post.post_platforms_raw.map((p) => {
                              const Icon =
                                platformIcons[p.platform.toLowerCase()] ??
                                FileText;
                              const isPublished = p.status === "published";
                              const isFailed = p.status === "failed";
                              const isRemovedExternally =
                                p.status === "removed_externally";
                              return (
                                <div
                                  key={p.id || p.platform}
                                  className="relative"
                                  title={`Status: ${p.status}`}
                                >
                                  <Icon
                                    className={cn(
                                      "h-4 w-4",
                                      isPublished
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : isFailed
                                          ? "text-red-600 dark:text-red-400"
                                          : isRemovedExternally
                                            ? "text-orange-600 dark:text-orange-400"
                                            : "text-muted-foreground",
                                    )}
                                  />
                                  {isPublished && (
                                    <div className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-card">
                                      <Check
                                        className="h-1.5 w-1.5 text-white"
                                        strokeWidth={4}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            post.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : post.status === "publishing"
                                ? "bg-indigo-500/10 text-indigo-400 animate-pulse"
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

                      {/* Media thumbnail (first item) + count of others */}
                      {primaryMedia && (
                        <div className="relative aspect-video max-h-[140px] overflow-hidden rounded-lg border border-white/10">
                          {isVideoUrl(primaryMedia) ? (
                            <video
                              src={primaryMedia}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              muted
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryMedia}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                          {extraMedia > 0 && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                              <ImageIcon className="h-3 w-3" />+{extraMedia}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content preview */}
                      <h3 className="line-clamp-2 text-sm font-medium">{preview}</h3>

                      {/* Internal labels (max 2 + overflow) */}
                      {visibleTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {visibleTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </span>
                          ))}
                          {extraTags > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              +{extraTags}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Relative / scheduled time */}
                      <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{timeLabel}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "K vyřízení" – manuální X příspěvky (Hybridní X režim, Krok 3) */}
      {data.todoPosts.filter((todo) => !markedIds.has(todo.id)).length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <XIcon className="h-4 w-4 text-sky-400" />
            <h2 className="text-lg font-semibold">{t("todoTitle")}</h2>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-400">
              {data.todoPosts.filter((todo) => !markedIds.has(todo.id)).length}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.todoPosts
              .filter((todo) => !markedIds.has(todo.id))
              .map((todo) => {
              const preview = buildRecentPostPreview(todo.content) || postsT("newPost");
              const primaryMedia = todo.media_urls[0] ?? null;
              const timeLabel = todo.scheduled_at
                ? t("scheduledFor", {
                    date: new Date(todo.scheduled_at).toLocaleDateString(locale),
                  })
                : null;

              return (
                <Card
                  key={todo.id}
                  className="bg-card/40 backdrop-blur-md border-white/5"
                >
                  <CardContent className="flex h-full flex-col gap-3 p-3.5">
                    <div className="flex items-center gap-1.5">
                      <XIcon className="h-4 w-4 text-sky-400" />
                      <span className="text-[11px] font-medium text-sky-400/80">
                        {t("manualReminder")}
                      </span>
                    </div>

                    {primaryMedia && (
                      <div className="relative aspect-video max-h-[140px] overflow-hidden rounded-lg border border-white/10">
                        {isVideoUrl(primaryMedia) ? (
                          <video
                            src={primaryMedia}
                            className="h-full w-full object-cover"
                            preload="metadata"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primaryMedia}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                    )}

                    <h3 className="line-clamp-3 whitespace-pre-wrap text-sm font-medium">
                      {preview}
                    </h3>

                    {timeLabel && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{timeLabel}</span>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleCopyText(todo.id, todo.content)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === todo.id
                          ? t("copied")
                          : t("copyText")}
                      </Button>
                      {primaryMedia && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          asChild
                        >
                          <a href={primaryMedia} download target="_blank" rel="noreferrer">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {t("downloadImage")}
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        disabled={markingId === todo.id}
                        onClick={() => handleMarkPublished(todo)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("markPublished")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <UpgradeBanner
        locale={locale}
        currentPlan={data.currentPlan}
        t={t}
        settingsT={settingsT}
      />

      <PreviewDialog
        open={previewOpen}
        onOpenChange={(isOpen) => {
          setPreviewOpen(isOpen);
          if (!isOpen) setPreviewPost(null);
        }}
        post={previewPost}
        userId={data.userId ?? undefined}
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
            <Link href={`/${locale}/settings/billing`}>
              {currentPlan === "pro" ? settingsT("upgrade") : t("proCtaButton")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
