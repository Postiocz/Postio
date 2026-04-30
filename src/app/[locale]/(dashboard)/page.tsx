import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, Copy, Plus, ArrowRight, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const commonT = await getTranslations({ locale, namespace: "common" });
  const settingsT = await getTranslations({ locale, namespace: "settings" });

  let totalPosts = 0;
  let connectedAccounts = 0;
  let streak = 0;
  let currentPlan = "free";

  try {
    const supabase = await createClient();

    const [postsData, accountsData, userData] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("social_accounts").select("*", { count: "exact", head: true }),
      supabase.from("users").select("streak, plan").single(),
    ]);

    totalPosts = postsData.count ?? 0;
    connectedAccounts = accountsData.count ?? 0;
    streak = userData.data?.streak ?? 0;
    currentPlan = userData.data?.plan ?? "free";
  } catch {
    // Supabase unavailable – use mock data for testing
    totalPosts = 0;
    connectedAccounts = 0;
    streak = 0;
    currentPlan = "free";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("totalPosts")} value={totalPosts} icon={FileText} />
        <StatCard title={t("scheduled")} value={0} icon={FileText} />
        <StatCard title={t("connectedAccounts")} value={connectedAccounts} icon={LinkIcon} />
        <StatCard title={t("streak")} value={`${streak}d`} icon={Copy} />
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
            title={t("connectAccount")}
            description={t("connectAccount")}
            href={`/${locale}/accounts`}
            icon={LinkIcon}
          />
          <QuickActionCard
            title={t("browseTemplates")}
            description={t("browseTemplates")}
            href={`/${locale}/templates`}
            icon={Copy}
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
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold tracking-tight">{value}</div>
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
          "group flex h-auto w-full flex-col items-start gap-3 rounded-xl p-6 text-left transition-all " +
          (isPrimary
            ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl"
            : "hover:bg-accent hover:shadow-md hover:-translate-y-0.5")
        }
      >
        <Icon className={isPrimary ? "h-6 w-6 text-primary-foreground" : "h-6 w-6 text-primary"} />
        <div className="text-left">
          <div className="text-base font-semibold">{title}</div>
          <div className={isPrimary ? "text-sm text-primary-foreground/80" : "text-sm text-muted-foreground"}>
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
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
      <CardContent className="relative p-6 sm:p-8">
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
