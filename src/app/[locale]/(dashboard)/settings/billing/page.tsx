/**
 * Billing Page – Fakturace
 * Zobrazuje master plány (Free → Creator → Pro) + běžné viditelné custom plány
 * (nikoli "new user only"). Pokud uživatel AKTIVNĚ používá promo plán, zobrazí
 * se jako jeho aktuální. Žádné jiné promo nabídky pro nové uživatele se
 * stávajícím uživatelům nezobrazují.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { BillingClient } from "./billing-client";
import { UsageDashboard } from "./usage-dashboard";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  const dashboardT = await getTranslations({ locale, namespace: "dashboard" });

  // Načti uživatele
  let userPlan = "free";
  let stripeCustomerId: string | null = null;
  let currentPlanInstanceId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase
      .from("users")
      .select("plan, stripe_customer_id, current_plan_instance_id")
      .single();

    userPlan = userData?.plan ?? "free";
    stripeCustomerId = userData?.stripe_customer_id ?? null;
    currentPlanInstanceId = userData?.current_plan_instance_id ?? null;
  } catch {
    // Supabase unavailable
  }

  // Načti master templates z DB
  const plans: {
    id: string;
    name: string;
    description: string;
    priceCzk: number;
    priceEur: number;
    priceUsd: number;
    accounts: string;
    postsPerMonth: string;
    templates: string;
    analytics: string;
    support: string;
    features: { label: string; value: string }[];
    isCurrent: boolean;
    isRecommended: boolean;
  }[] = [];

  try {
    const supabase = createAdminClient();

    // 1. Načti master templates (free, creator, pro)
    const { data: masters } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_master_template", true)
      .order("type", { ascending: true });

    if (masters) {
      // Explicit sort: Free → Creator → Pro (not alphabetical)
      const typeOrder: Record<string, number> = { free: 0, creator: 1, pro: 2 };
      masters.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99));

      for (const master of masters) {
        let localizedName = master.name;
        if (locale === "en" && master.name_en) localizedName = master.name_en;
        else if (locale === "uk" && master.name_uk) localizedName = master.name_uk;

        const planType = master.type;
        const planId = `plan_${planType}`;

        plans.push({
          id: planId,
          name: localizedName,
          description: "",
          priceCzk: master.price_czk / 100,
          priceEur: master.price_eur / 100,
          priceUsd: master.price_usd / 100,
          accounts: master.max_accounts === -1 ? "∞" : String(master.max_accounts),
          postsPerMonth: master.max_posts_per_month === null
            ? t("unlimited")
            : String(master.max_posts_per_month),
          templates: planType === "pro" ? t("unlimited") : planType === "free" ? t("basic") : t("advanced"),
          analytics: planType === "free" ? t("basic") : t("advanced"),
          support: planType === "free" ? "Community" : t("priority"),
          features: [
            { label: dashboardT("socialAccounts"), value: master.max_accounts === -1 ? "∞" : String(master.max_accounts) },
            { label: dashboardT("postsPerMonth"), value: master.max_posts_per_month === null ? t("unlimited") : String(master.max_posts_per_month) },
            { label: dashboardT("templates"), value: planType === "pro" ? t("unlimited") : planType === "free" ? t("basic") : t("advanced") },
            { label: dashboardT("analytics"), value: planType === "free" ? t("basic") : t("advanced") },
            {
              label: dashboardT("prioritySupport"),
              value: planType === "free" ? "Community" : t("priority"),
            },
            { label: dashboardT("aiImages"), value: String(master.ai_credits) },
            { label: dashboardT("xAutoPosts"), value: String(master.twitter_credits) },
          ],
          isCurrent: userPlan === planType || master.id === currentPlanInstanceId,
          isRecommended: planType === "creator",
        });
      }
    }

    // 2. Načti vlastní (custom) plány – viditelné podle aktuálního tarifu uživatele.
    //    Granulární viditelnost: `visibility_rules` musí obsahovat hodnotpu
    //    odpovídající aktuálnímu tarifu (users.plan = free/creator/pro).
    const { data: customPlans } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_master_template", false)
      .eq("is_visible", true)
      .contains("visibility_rules", [userPlan])
      .order("created_at", { ascending: true });

    if (customPlans) {
      for (const customPlan of customPlans) {
        let localizedName = customPlan.name;
        if (locale === "en" && customPlan.name_en) localizedName = customPlan.name_en;
        else if (locale === "uk" && customPlan.name_uk) localizedName = customPlan.name_uk;

        let localizedDesc = customPlan.description || "";
        if (locale === "en" && customPlan.description_en) localizedDesc = customPlan.description_en;
        else if (locale === "uk" && customPlan.description_uk) localizedDesc = customPlan.description_uk;

        plans.push({
          id: customPlan.id,
          name: localizedName,
          description: localizedDesc,
          priceCzk: customPlan.price_czk / 100,
          priceEur: customPlan.price_eur / 100,
          priceUsd: customPlan.price_usd / 100,
          accounts: customPlan.max_accounts === -1 ? "∞" : String(customPlan.max_accounts),
          postsPerMonth: customPlan.max_posts_per_month === null
            ? t("unlimited")
            : String(customPlan.max_posts_per_month),
          templates: t("basic"),
          analytics: t("basic"),
          support: t("priority"),
          features: [
            { label: dashboardT("socialAccounts"), value: customPlan.max_accounts === -1 ? "∞" : String(customPlan.max_accounts) },
            { label: dashboardT("postsPerMonth"), value: customPlan.max_posts_per_month === null ? t("unlimited") : String(customPlan.max_posts_per_month) },
            { label: dashboardT("aiImages"), value: String(customPlan.ai_credits) },
            { label: dashboardT("xAutoPosts"), value: String(customPlan.twitter_credits) },
          ],
          isCurrent: customPlan.id === currentPlanInstanceId,
          isRecommended: false,
        });
      }
    }

    // 3. VÝJIMKA: Pokud uživatel AKTIVNĚ používá promo plán (current_plan_instance_id),
    //    musí ho vidět jako svůj aktuální – i když je is_new_user_only.
    if (currentPlanInstanceId) {
      const { data: activePromo } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("id", currentPlanInstanceId)
        .eq("is_master_template", false)
        .single();

      // Zobraz jej, jen pokud ještě není v seznamu (např. běžný custom plán).
      const alreadyListed = plans.some((p) => p.id === currentPlanInstanceId);
      if (activePromo && !alreadyListed) {
        let localizedName = activePromo.name;
        if (locale === "en" && activePromo.name_en) localizedName = activePromo.name_en;
        else if (locale === "uk" && activePromo.name_uk) localizedName = activePromo.name_uk;

        let localizedDesc = activePromo.description || "";
        if (locale === "en" && activePromo.description_en) localizedDesc = activePromo.description_en;
        else if (locale === "uk" && activePromo.description_uk) localizedDesc = activePromo.description_uk;

        plans.push({
          id: activePromo.id,
          name: localizedName,
          description: localizedDesc,
          priceCzk: activePromo.price_czk / 100,
          priceEur: activePromo.price_eur / 100,
          priceUsd: activePromo.price_usd / 100,
          accounts: activePromo.max_accounts === -1 ? "∞" : String(activePromo.max_accounts),
          postsPerMonth: activePromo.max_posts_per_month === null
            ? t("unlimited")
            : String(activePromo.max_posts_per_month),
          templates: t("basic"),
          analytics: t("basic"),
          support: t("priority"),
          features: [
            { label: dashboardT("socialAccounts"), value: activePromo.max_accounts === -1 ? "∞" : String(activePromo.max_accounts) },
            { label: dashboardT("postsPerMonth"), value: activePromo.max_posts_per_month === null ? t("unlimited") : String(activePromo.max_posts_per_month) },
            { label: dashboardT("aiImages"), value: String(activePromo.ai_credits) },
            { label: dashboardT("xAutoPosts"), value: String(activePromo.twitter_credits) },
          ],
          isCurrent: true,
          isRecommended: false,
        });
      }
    }
  } catch {
    // DB unavailable – fallback na hardcoded
  }

  // Fallback: pokud se DB nepodařilo načíst, použij základní hardcoded plány
  if (plans.length === 0) {
    plans.push(
      {
        id: "free",
        name: t("free"),
        description: t("freeDesc"),
        priceCzk: 0,
        priceEur: 0,
        priceUsd: 0,
        accounts: "1",
        postsPerMonth: "10",
        templates: t("basic"),
        analytics: t("basic"),
        support: "Community",
        features: [
          { label: dashboardT("socialAccounts"), value: "1" },
          { label: dashboardT("postsPerMonth"), value: "10" },
          { label: dashboardT("templates"), value: t("basic") },
          { label: dashboardT("analytics"), value: t("basic") },
          { label: dashboardT("aiImages"), value: "0" },
          { label: dashboardT("xAutoPosts"), value: "0" },
        ],
        isCurrent: userPlan === "free",
        isRecommended: false,
      },
      {
        id: "creator",
        name: t("creator"),
        description: t("creatorDesc"),
        priceCzk: 199,
        priceEur: 8,
        priceUsd: 9,
        accounts: "5",
        postsPerMonth: t("unlimited"),
        templates: t("advanced"),
        analytics: t("advanced"),
        support: t("priority"),
        features: [
          { label: dashboardT("socialAccounts"), value: "5" },
          { label: dashboardT("postsPerMonth"), value: t("unlimited") },
          { label: dashboardT("templates"), value: t("advanced") },
          { label: dashboardT("analytics"), value: t("advanced") },
          { label: dashboardT("prioritySupport"), value: t("priority") },
          { label: dashboardT("aiImages"), value: "10" },
          { label: dashboardT("xAutoPosts"), value: "10" },
        ],
        isCurrent: userPlan === "creator",
        isRecommended: true,
      },
      {
        id: "pro",
        name: t("pro"),
        description: t("proDesc"),
        priceCzk: 499,
        priceEur: 20,
        priceUsd: 22,
        accounts: "∞",
        postsPerMonth: t("unlimited"),
        templates: t("unlimited"),
        analytics: t("advanced"),
        support: t("priority"),
        features: [
          { label: dashboardT("socialAccounts"), value: "∞" },
          { label: dashboardT("postsPerMonth"), value: t("unlimited") },
          { label: dashboardT("templates"), value: t("unlimited") },
          { label: dashboardT("analytics"), value: t("advanced") },
          { label: dashboardT("prioritySupport"), value: t("priority") },
          { label: dashboardT("aiImages"), value: "50" },
          { label: dashboardT("xAutoPosts"), value: "50" },
        ],
        isCurrent: userPlan === "pro",
        isRecommended: false,
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {stripeCustomerId && (
        <ManageSubscriptionButton />
      )}

      <UsageDashboard locale={locale} />

      <BillingClient
        plans={plans}
        locale={locale}
        translations={{
          current: t("current"),
          recommended: t("recommended"),
          perMonth: t("perMonth"),
          subscribe: t("subscribe"),
          upgrade: t("upgrade"),
          free: t("free"),
        }}
      />
    </div>
  );
}
