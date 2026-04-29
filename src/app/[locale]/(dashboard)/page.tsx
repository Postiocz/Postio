import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, Copy, Plus } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("dashboard");
  const { locale } = await params;

  let totalPosts = 0;
  let connectedAccounts = 0;
  let streak = 0;

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
  } catch {
    // Supabase unavailable – use mock data for testing
    totalPosts = 0;
    connectedAccounts = 0;
    streak = 0;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
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
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="group flex h-auto flex-col items-start gap-2 p-4 hover:bg-accent"
      >
        <Icon className="h-5 w-5 text-primary transition-colors group-hover:text-primary" />
        <div className="text-left">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </Button>
    </Link>
  );
}
