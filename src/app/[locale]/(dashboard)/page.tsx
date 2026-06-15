import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, Copy, Plus, ArrowRight, Crown, Sparkles, Flame, Calendar as CalendarIcon, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TopLabelsChart, type TopLabelItem } from "@/components/dashboard/top-labels-chart";
import { PlatformDonutChart, type PlatformDatum } from "@/components/dashboard/platform-donut-chart";
import {
  aggregateTopLabels,
  aggregatePlatforms,
  prioritizeForDonut,
  calculateStreak,
  calculateTrend,
} from "@/lib/dashboard-stats";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const navT = await getTranslations({ locale, namespace: "nav" });
  const commonT = await getTranslations({ locale, namespace: "common" });
  const settingsT = await getTranslations({ locale, namespace: "settings" });

  let totalPosts = 0;
  let scheduledPosts = 0;
  let connectedAccounts = 0;
  let dbStreak = 0;
  let currentPlan = "free";
  let consistencyScore = 89;
  let topLabels: TopLabelItem[] = [];
  let platformData: PlatformDatum[] = [];
  let publishedTotal = 0;
  let weeklyTrend = 0;
  let streak = 0;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
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
        accountsData,
        userData,
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
          .select("post_id, posts!inner(user_id)", { count: "exact", head: true })
          .eq("posts.user_id", user.id)
          .eq("status", "scheduled"),
        // 3. Aktivní sociální účty.
        supabase
          .from("social_accounts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_active", true),
        // 4. User profil (streak + plán).
        supabase.from("users").select("streak, plan").eq("id", user.id).single(),
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
        supabase
          .from("posts")
          .select("created_at")
          .eq("user_id", user.id),
      ]);

      totalPosts = postsData.count ?? 0;
      scheduledPosts = scheduledData.count ?? 0;
      connectedAccounts = accountsData.count ?? 0;
      dbStreak = userData.data?.streak ?? 0;
      currentPlan = userData.data?.plan ?? "free";

      // Top štítky (agregace z post_tags + tags).
      if (postTagsRows.data) {
        topLabels = aggregateTopLabels(
          // Supabase vrací tags jako objekt nebo pole – ošetříme oba případy.
          postTagsRows.data.map((r) => ({
            tag_id: r.tag_id as string,
            tags: Array.isArray(r.tags) ? r.tags[0] ?? null : r.tags,
          }))
        );
      }

      // Platformy donut chart.
      if (publishedPlatformsRows.data) {
        platformData = prioritizeForDonut(
          aggregatePlatforms(publishedPlatformsRows.data)
        );
        publishedTotal = publishedPlatformsRows.data.length;

        // Streak – preferujeme dynamický výpočet (úkol: "musí být funkční").
        // Vypočítáme z publikovaných datumů; pokud výpočet > 0, použijeme ho,
        // jinak fallback na DB hodnotu (kterou aktualizuje cron job).
        const publishedDates = publishedPlatformsRows.data
          .map((r) => r.published_at)
          .filter((d): d is string => Boolean(d));
        const calculatedStreak = calculateStreak(publishedDates);
        streak = calculatedStreak > 0 ? calculatedStreak : dbStreak;
      }

      // Trend za posledních 7 dní.
      if (postCreatedAtRows.data) {
        weeklyTrend = calculateTrend(
          postCreatedAtRows.data.map((r) => r.created_at)
        );
      }
    }
  } catch {
    // Supabase unavailable – use mock data for testing.
    totalPosts = 0;
    scheduledPosts = 0;
    connectedAccounts = 0;
    streak = 0;
    currentPlan = "free";
    consistencyScore = 89;
  }

  return (
    <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground/60">{t("subtitle")}</p>
        </div>

        {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalPosts")}
          value={totalPosts}
          icon={FileText}
          trend={{
            value: weeklyTrend,
            label: t("thisWeek"),
          }}
        />
        <StatCard title={t("scheduled")} value={scheduledPosts} icon={CalendarIcon} />
        <StatCard title={t("connectedAccounts")} value={connectedAccounts} icon={LinkIcon} />
        <StatCard
          title={t("streak")}
          value={`${streak}d`}
          icon={Flame}
          isGlowing={streak > 0}
        />
      </div>

      {/* Analytics row – grafy: konzistence + donut + top labels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ConsistencyScore score={consistencyScore} label={t("consistencyScore")} />
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <PlatformDonutChart
            data={platformData}
            total={publishedTotal}
            translations={{
              title: t("platformBreakdown"),
              emptyTitle: t("platformEmptyTitle"),
              emptyDescription: t("platformEmptyDescription"),
              published: t("published"),
            }}
          />
          <TopLabelsChart
            labels={topLabels}
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
            description={t("newPost")}
            href={`/${locale}/posts/new`}
            icon={Plus}
            emphasis="primary"
          />
          <QuickActionCard
            title={navT("templates")}
            description={navT("templates")}
            href={`/${locale}/templates`}
            icon={Copy}
          />
          <QuickActionCard
            title={navT("analytics")}
            description={navT("analytics")}
            href={`/${locale}/analytics`}
            icon={BarChart3}
          />
        </div>
      </div>

      <UpgradeBanner
        locale={locale}
        currentPlan={currentPlan}
        translations={{
          title: t("proCtaTitle"),
          subtitle: t("proCtaSubtitle"),
          button: t("proCtaButton"),
          currentPlan: t("currentPlan"),
          upgrade: settingsT("upgrade"),
          free: commonT("free"),
        }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  isGlowing = false,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isGlowing?: boolean;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-3 w-3 text-muted-foreground/40",
          isGlowing && "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
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
    </Card>
  );
}

function ConsistencyScore({ score, label }: { score: number; label: string }) {
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
              <linearGradient id="consistencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
            {score >= 80 ? "Výborná konzistence!" : score >= 50 ? "Dobrá, můžeš lepší!" : "Zkus postovat pravidelněji."}
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
        <Icon className={isPrimary ? "h-6 w-6 text-white" : "h-6 w-6 text-primary"} />
        <div className="text-left">
          <div className="text-base font-semibold">{title}</div>
          <div className={isPrimary ? "text-sm text-white" : "text-sm text-muted-foreground"}>
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
  translations,
}: {
  locale: string;
  currentPlan: string;
  translations: {
    title: string;
    subtitle: string;
    button: string;
    currentPlan: string;
    upgrade: string;
    free: string;
  };
}) {
  const planLabel =
    currentPlan === "pro"
      ? "pro"
      : currentPlan === "creator"
      ? "creator"
      : translations.free;

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
              <h3 className="text-lg font-semibold sm:text-xl">{translations.title}</h3>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {translations.subtitle}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">{translations.currentPlan}</span>
              <Badge variant={currentPlan === "pro" ? "default" : currentPlan === "creator" ? "secondary" : "outline"}>
                {planLabel}
              </Badge>
            </div>
          </div>

          <Button asChild className="gap-2 sm:self-center">
            <Link href={`/${locale}/settings`}>
              {currentPlan === "pro" ? translations.upgrade : translations.button}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
