/**
 * Admin – Správa tarifů
 * Zobrazuje master templates, aktivní tarify, vlastní a archivované plány
 * i18n: namespace adminBillingPlansPage
 */

import { getTranslations } from "next-intl/server";
import { getAllPricingPlans } from "@/lib/actions/pricing-plans";
import { PricingPlansClient } from "./plans-client";
import { Shield, Crown, Sparkles, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const t = await getTranslations({
    locale: localeParam,
    namespace: "adminBillingPlansPage",
  });

  const allPlans = await getAllPricingPlans();
  const masterTemplates = allPlans.filter((p) => p.is_master_template);

  // Aktivní základní tarify (non-master, viditelné, ne custom)
  let baseActivePlans = allPlans.filter(
    (p) => !p.is_master_template && !p.is_custom && p.is_active && p.is_visible
  );
  if (baseActivePlans.length === 0) {
    baseActivePlans = masterTemplates;
  }

  // Vlastní plány (custom, viditelné)
  const customPlans = allPlans.filter(
    (p) => p.is_custom && p.is_visible
  );

  // Archivované (neviditelné, ne master)
  const archivedPlans = allPlans.filter(
    (p) => !p.is_visible && !p.is_master_template
  );

  // Seřazení
  const typeOrder: Record<string, number> = { free: 0, creator: 1, pro: 2 };
  const sortedMasters = [...masterTemplates].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type]
  );
  const sortedBase = [...baseActivePlans].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type]
  );
  const sortedCustom = [...customPlans].sort((a, b) => a.name.localeCompare(b.name));
  const sortedArchived = [...archivedPlans].sort((a, b) => a.name.localeCompare(b.name));

  const keys = [
    "resetToMaster", "resetSingleConfirm", "resetSuccess", "resetError",
    "editPlan", "saveChanges", "cancel",
    "priceCzk", "priceEur", "priceUsd",
    "aiCredits", "twitterCredits", "maxAccounts", "maxPosts",
    "unlimited", "free",
    "createPlan", "planName", "customPlans", "archivedPlans",
    "noArchived", "deletePlan", "deleteConfirm", "showPlan", "hidePlan",
    "translateToEn", "translateToUk",
    "maxSubscriptions", "subscribersCount",
    "description", "badgeText", "isRecommended", "badgeColor",
    "visibilityTitle", "visibilityAnonymous", "visibilityFree",
    "visibilityCreator", "visibilityPro",
  ] as const;

  const translations: Record<string, string> = {};
  for (const key of keys) translations[key] = t(key);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      {/* Master Templates */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("masterTemplates")}</h2>
        </div>
        <p className="text-sm text-slate-400 dark:text-gray-500 max-w-2xl">{t("masterTemplatesDesc")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedMasters.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[20px] border border-indigo-500/30 bg-indigo-500/5 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-300">
                  {plan.type}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <DetailRow label={t("priceCzk")} value={plan.price_czk === 0 ? t("free") : `${plan.price_czk / 100} Kč`} />
                <DetailRow label={t("priceEur")} value={plan.price_eur === 0 ? t("free") : `${plan.price_eur / 100} EUR`} />
                <DetailRow label={t("priceUsd")} value={plan.price_usd === 0 ? t("free") : `$${plan.price_usd / 100}`} />
                <div className="border-t border-slate-200 dark:border-white/10 my-3" />
                <DetailRow label={t("aiCredits")} value={String(plan.ai_credits)} />
                <DetailRow label={t("twitterCredits")} value={String(plan.twitter_credits)} />
                <DetailRow label={t("maxAccounts")} value={plan.max_accounts === -1 ? "∞" : String(plan.max_accounts)} />
                <DetailRow label={t("maxPosts")} value={plan.max_posts_per_month === null ? "∞" : String(plan.max_posts_per_month)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active & Custom Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("activePlans")}</h2>
        </div>
        <p className="text-sm text-slate-400 dark:text-gray-500 max-w-2xl">{t("activePlansDesc")}</p>

        <PricingPlansClient
          activePlans={sortedBase}
          customPlans={sortedCustom}
          archivedPlans={sortedArchived}
          masterTemplates={sortedMasters}
          locale={localeParam}
          translations={translations}
        />
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-gray-400">{label}</span>
      <span className="text-slate-900 dark:text-white font-medium">{value}</span>
    </div>
  );
}
