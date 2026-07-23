/**
 * Admin Dashboard – hlavní stránka pro administrátory
 * URL: /cs/admin
 */

import { getGlobalStats } from "@/modules/admin-core/actions";
import { MetricCard } from "@/modules/admin-core/components/metric-card";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getGlobalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-400">
          Globální přehled platformy Postio
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Celkem uživatelů"
          value={stats.totalUsers}
          icon={Users}
        />
        <MetricCard
          title="Zaplacení uživatelé"
          value={stats.payingUsers}
          icon={CreditCard}
        />
        <MetricCard
          title="Celkem příspěvků"
          value={stats.totalPosts}
          icon={FileText}
        />
        <MetricCard
          title="Dnešní tržby"
          value="—"
          change="Figma v budoucnu"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
