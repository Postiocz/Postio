/**
 * Admin Dashboard – hlavní stránka pro administrátory
 * URL: /cs/admin
 * i18n: namespace adminDashboard
 */

import { getTranslations } from "next-intl/server";
import { getGlobalStats } from "@/modules/admin-core/actions";
import { MetricCard } from "@/modules/admin-core/components/metric-card";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminDashboard" });
  const stats = await getGlobalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="text-sm text-gray-400">{t("subtitle")}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("totalUsers")}
          value={stats.totalUsers}
          icon={Users}
        />
        <MetricCard
          title={t("payingUsers")}
          value={stats.payingUsers}
          icon={CreditCard}
        />
        <MetricCard
          title={t("totalPosts")}
          value={stats.totalPosts}
          icon={FileText}
        />
        <MetricCard
          title={t("todayRevenue")}
          value="—"
          change={t("futureFeature")}
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
