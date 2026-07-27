/**
 * Admin – Správa tarifů
 * Zobrazuje master templates a aktivní verze tarifů
 * Umožňuje úpravu cen a reset k původním hodnotám
 * i18n: namespace adminBillingPlansPage
 */

import { getTranslations } from "next-intl/server";
import {
  getAllPricingPlans,
  getMasterTemplates,
} from "@/lib/actions/pricing-plans";
import { PricingPlansClient } from "./plans-client";
import { Crown, Shield, RefreshCw } from "lucide-react";

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

  // Aktivní tarify = buď non-master, nebo master pokud neexistují non-master
  // (při prvním spuštění jsou master templates zároveň aktivními)
  let activePlans = allPlans.filter((p) => !p.is_master_template && p.is_active);

  // Pokud neexistují aktivní non-master tarify, použij master templates jako editovatelné
  if (activePlans.length === 0) {
    activePlans = masterTemplates;
  }

  // Seřaď tarify podle typu: free -> creator -> pro
  const typeOrder = { free: 0, creator: 1, pro: 2 };
  const sortedMasterTemplates = [...masterTemplates].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type]
  );
  const sortedActivePlans = [...activePlans].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-400">{t("subtitle")}</p>
        </div>
      </div>

      {/* Master Templates Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">
            {t("masterTemplates")}
          </h2>
        </div>
        <p className="text-sm text-gray-500 max-w-2xl">
          {t("masterTemplatesDesc")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedMasterTemplates.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[20px] border border-indigo-500/30 bg-indigo-500/5 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                  {plan.type}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("priceCzk")}</span>
                  <span className="text-white font-medium">
                    {plan.price_czk === 0 ? t("free") : `${plan.price_czk / 100} Kč`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("priceEur")}</span>
                  <span className="text-white font-medium">
                    {plan.price_eur === 0 ? t("free") : `${plan.price_eur / 100} EUR`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("priceUsd")}</span>
                  <span className="text-white font-medium">
                    {plan.price_usd === 0 ? t("free") : `$${plan.price_usd / 100}`}
                  </span>
                </div>
                <div className="border-t border-white/10 my-3" />
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("aiCredits")}</span>
                  <span className="text-white">{plan.ai_credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("twitterCredits")}</span>
                  <span className="text-white">{plan.twitter_credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("maxAccounts")}</span>
                  <span className="text-white">
                    {plan.max_accounts === -1 ? "∞" : plan.max_accounts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t("maxPosts")}</span>
                  <span className="text-white">
                    {plan.max_posts_per_month === null
                      ? "∞"
                      : plan.max_posts_per_month}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Plans Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">
            {t("activePlans")}
          </h2>
        </div>
        <p className="text-sm text-gray-500 max-w-2xl">
          {t("activePlansDesc")}
        </p>

        <PricingPlansClient
          plans={sortedActivePlans}
          masterTemplates={sortedMasterTemplates}
          translations={{
            resetToMaster: t("resetToMaster"),
            resetConfirm: t("resetConfirm"),
            resetSingleConfirm: t("resetSingleConfirm"),
            resetSuccess: t("resetSuccess"),
            resetError: t("resetError"),
            editPlan: t("editPlan"),
            saveChanges: t("saveChanges"),
            cancel: t("cancel"),
            priceCzk: t("priceCzk"),
            priceEur: t("priceEur"),
            priceUsd: t("priceUsd"),
            aiCredits: t("aiCredits"),
            twitterCredits: t("twitterCredits"),
            maxAccounts: t("maxAccounts"),
            maxPosts: t("maxPosts"),
            unlimited: t("unlimited"),
            free: t("free"),
          }}
        />
      </section>
    </div>
  );
}
