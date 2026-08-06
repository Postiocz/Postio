/**
 * Usage Dashboard – "Aktuální čerpání" widget for the Billing page.
 *
 * Server component: reads the signed-in user's remaining credits
 * (`users.ai_credits`, `users.twitter_auto_credits`), resolves the limits of
 * their current plan from `pricing_plans` (custom instance first, master
 * template fallback) and renders graphical progress bars for:
 *   - AI credits remaining (X of Y)
 *   - X (Twitter) auto-post credits remaining (X of Y)
 *   - connected accounts vs the plan limit
 *
 * Uses the admin client for `pricing_plans` (same approach as the billing
 * page) and the RLS-scoped client for the user's own credits/account count.
 */

import type { ReactNode } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { getAccountLimitInfo, ACCOUNT_LIMITS } from "@/lib/account-limit";
import { Sparkles, Users } from "lucide-react";
import { Twitter } from "@/components/ui/social-icons";

interface UsageBarData {
  icon: ReactNode;
  label: string;
  /** Pre-formatted right-hand value, e.g. "Zbývá 3 z 10" or "5 / ∞". */
  valueText: string;
  /** Amount left in the user's balance (credits / connected accounts). */
  remaining: number;
  /** Total allowance for the current plan (Infinity = unlimited). */
  total: number;
}

/** Clamp the fill width of a bar to 0..100 %. */
function percent(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
}

/** Single progress-bar row rendered on the billing page. */
function UsageBar({ icon, label, valueText, remaining, total }: UsageBarData) {
  const pct = percent(remaining, total);
  const isUnlimited = total === Infinity;
  // Warm the bar when less than 20 % of the allowance is left.
  const low = !isUnlimited && total > 0 && pct <= 20;
  const fill =
    low
      ? "from-amber-500 to-orange-500"
      : "from-indigo-500 to-purple-500";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span aria-hidden className="text-foreground/70">
            {icon}
          </span>
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium tabular-nums">{valueText}</span>
      </div>
      {!isUnlimited && (
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${fill} transition-[width] duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export async function UsageDashboard({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "billing" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Remaining balances from the user's own row (RLS-scoped).
  let aiRemaining = 0;
  let twitterRemaining = 0;
  let plan: "free" | "creator" | "pro" = "free";
  let currentPlanInstanceId: string | null = null;

  if (user) {
    const { data: userRow } = await supabase
      .from("users")
      .select("plan, ai_credits, twitter_auto_credits, current_plan_instance_id")
      .eq("id", user.id)
      .single();

    plan = userRow?.plan ?? "free";
    aiRemaining = userRow?.ai_credits ?? 0;
    twitterRemaining = userRow?.twitter_auto_credits ?? 0;
    currentPlanInstanceId = userRow?.current_plan_instance_id ?? null;
  }

  // Resolve the current plan's limits (custom instance → master fallback).
  let aiTotal = 0;
  let twitterTotal = 0;
  let maxAccounts: number = ACCOUNT_LIMITS[plan];

  try {
    const admin = createAdminClient();
    const query = currentPlanInstanceId
      ? admin
          .from("pricing_plans")
          .select("ai_credits, twitter_credits, max_accounts")
          .eq("id", currentPlanInstanceId)
      : admin
          .from("pricing_plans")
          .select("ai_credits, twitter_credits, max_accounts")
          .eq("is_master_template", true)
          .eq("type", plan);

    const { data: planRow } = await query.maybeSingle();
    if (planRow) {
      aiTotal = planRow.ai_credits ?? 0;
      twitterTotal = planRow.twitter_credits ?? 0;
      maxAccounts =
        planRow.max_accounts === -1 ? Infinity : planRow.max_accounts;
    }
  } catch {
    // DB unavailable – keep the default limits.
  }

  // Connected account count via the shared helper (RLS-scoped).
  let activeAccounts = 0;
  if (user) {
    try {
      const info = await getAccountLimitInfo(supabase, user.id);
      activeAccounts = info.activeCount;
    } catch {
      activeAccounts = 0;
    }
  }

  // Pre-format the right-hand value once so the bar row stays presentational.
  const aiValue = t("usageRemaining", { remaining: aiRemaining, total: aiTotal });
  const twitterValue = t("usageRemaining", {
    remaining: twitterRemaining,
    total: twitterTotal,
  });
  const accountsValue =
    maxAccounts === Infinity
      ? `${activeAccounts} / ∞`
      : t("usageRemaining", { remaining: activeAccounts, total: maxAccounts });

  const bars: UsageBarData[] = [
    {
      icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} />,
      label: t("usageAiCredits"),
      valueText: aiValue,
      remaining: aiRemaining,
      total: aiTotal,
    },
    {
      icon: <Twitter className="h-4 w-4" />,
      label: t("usageTwitterCredits"),
      valueText: twitterValue,
      remaining: twitterRemaining,
      total: twitterTotal,
    },
    {
      icon: <Users className="h-4 w-4" strokeWidth={1.5} />,
      label: t("usageAccounts"),
      valueText: accountsValue,
      remaining: activeAccounts,
      total: maxAccounts,
    },
  ];

  return (
    <section
      aria-label={t("usageTitle")}
      className="rounded-[20px] border border-slate-200 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md dark:border-white/10 dark:bg-[#09090b]/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6"
    >
      <h2 className="text-sm font-semibold tracking-tight">
        {t("usageTitle")}
      </h2>
      <div className="mt-5 space-y-5">
        {bars.map((bar) => (
          <UsageBar key={bar.label} {...bar} />
        ))}
      </div>
    </section>
  );
}
