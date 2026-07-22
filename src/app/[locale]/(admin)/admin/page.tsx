/**
 * Admin Dashboard – vstupní stránka pro administrátory
 * Obsahuje metric karty pro rychlý přehled.
 */

import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/admin/metric-card";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  // Statistiky
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: postCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  const { count: payingUserCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("plan", ["creator", "pro"]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-400">
          Přehled celé platformy Postio
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Celkem uživatelů"
          value={userCount ?? 0}
          icon={Users}
        />
        <MetricCard
          title="Zaplacení uživatelé"
          value={payingUserCount ?? 0}
          icon={CreditCard}
        />
        <MetricCard
          title="Celkem příspěvků"
          value={postCount ?? 0}
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
