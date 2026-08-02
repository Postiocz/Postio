import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/marketing/reveal";
import { PricingClient } from "@/components/marketing/pricing-client";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

// Public pricing section for the landing page. Server component builds the
// localized plan data (master templates + custom plans, both from DB) and
// hands it to the PricingClient island, which owns currency state + rendering.
interface Feature {
  label: string;
  value: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  priceCzk: number;
  priceEur: number;
  priceUsd: number;
  features: Feature[];
  isRecommended: boolean;
  ctaLabel: string;
  badgeText?: string;
  badgeColor?: string;
  activeUntil?: string;
  isPromo?: boolean;
}

type PricingPlanRow = Database["public"]["Tables"]["pricing_plans"]["Row"];

// Pevné pořadí master šablon: Free → Creator → Pro
const MASTER_TYPE_ORDER: Record<string, number> = { free: 0, creator: 1, pro: 2 };

/**
 * Fallback: pokud je DB nedostupná, použij hardcoded hodnoty, aby ceník
 * nezůstal prázdný. Jedná se o "nouzovou zálohu", nikoli hlavní zdroj.
 */
function buildFallbackPlans(t: (key: string) => string): Plan[] {
  return [
    {
      id: "free",
      name: t("pricing.free"),
      description: t("pricing.freeDesc"),
      priceCzk: 0,
      priceEur: 0,
      priceUsd: 0,
      features: [
        { label: t("pricing.accounts"), value: "1" },
        { label: t("pricing.postsPerMonth"), value: "10" },
        { label: t("pricing.templates"), value: t("pricing.basic") },
        { label: t("pricing.analytics"), value: t("pricing.basic") },
        { label: t("pricing.aiImages"), value: "0" },
        { label: t("pricing.xAutoPosts"), value: "0" },
      ],
      isRecommended: false,
      ctaLabel: t("pricing.ctaFree"),
    },
    {
      id: "creator",
      name: t("pricing.creator"),
      description: t("pricing.creatorDesc"),
      priceCzk: 199,
      priceEur: 8,
      priceUsd: 9,
      features: [
        { label: t("pricing.accounts"), value: "5" },
        { label: t("pricing.postsPerMonth"), value: t("pricing.unlimited") },
        { label: t("pricing.templates"), value: t("pricing.advanced") },
        { label: t("pricing.analytics"), value: t("pricing.advanced") },
        { label: t("pricing.support"), value: t("pricing.priority") },
        { label: t("pricing.aiImages"), value: "10" },
        { label: t("pricing.xAutoPosts"), value: "10" },
      ],
      isRecommended: true,
      ctaLabel: t("pricing.ctaPaid"),
    },
    {
      id: "pro",
      name: t("pricing.pro"),
      description: t("pricing.proDesc"),
      priceCzk: 499,
      priceEur: 20,
      priceUsd: 22,
      features: [
        { label: t("pricing.accounts"), value: "∞" },
        { label: t("pricing.postsPerMonth"), value: t("pricing.unlimited") },
        { label: t("pricing.templates"), value: t("pricing.unlimited") },
        { label: t("pricing.analytics"), value: t("pricing.advanced") },
        { label: t("pricing.support"), value: t("pricing.priority") },
        { label: t("pricing.aiImages"), value: "50" },
        { label: t("pricing.xAutoPosts"), value: "50" },
      ],
      isRecommended: false,
      ctaLabel: t("pricing.ctaPaid"),
    },
  ];
}

export async function PricingSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });

  let plans: Plan[] = [];
  let dbAvailable = true;

  try {
    const supabase = createAdminClient();
    const now = new Date();

    // ── 1. Master šablony z DB (is_master_template + veřejné) ──────────────
    const { data: masterDbPlans } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_master_template", true)
      .eq("is_visible", true)
      .eq("is_public", true);

    if (masterDbPlans && masterDbPlans.length > 0) {
      // Pevné pořadí: Free → Creator → Pro
      const sortedMasters = [...masterDbPlans].sort(
        (a, b) =>
          (MASTER_TYPE_ORDER[a.type] ?? 99) - (MASTER_TYPE_ORDER[b.type] ?? 99)
      );

      for (const dbPlan of sortedMasters) {
        const planType = dbPlan.type;

        let localizedName = dbPlan.name;
        if (locale === "en" && dbPlan.name_en) localizedName = dbPlan.name_en;
        else if (locale === "uk" && dbPlan.name_uk) localizedName = dbPlan.name_uk;

        let localizedDesc = dbPlan.description || "";
        if (locale === "en" && dbPlan.description_en) localizedDesc = dbPlan.description_en;
        else if (locale === "uk" && dbPlan.description_uk) localizedDesc = dbPlan.description_uk;

        let localizedBadge = dbPlan.badge_text || "";
        if (locale === "en" && dbPlan.badge_text_en) localizedBadge = dbPlan.badge_text_en;
        else if (locale === "uk" && dbPlan.badge_text_uk) localizedBadge = dbPlan.badge_text_uk;

        plans.push({
          id: planType,
          name: localizedName,
          description: localizedDesc,
          priceCzk: dbPlan.price_czk / 100,
          priceEur: dbPlan.price_eur / 100,
          priceUsd: dbPlan.price_usd / 100,
          features: [
            { label: t("pricing.accounts"), value: dbPlan.max_accounts === -1 ? "∞" : String(dbPlan.max_accounts) },
            { label: t("pricing.postsPerMonth"), value: dbPlan.max_posts_per_month === null ? t("pricing.unlimited") : String(dbPlan.max_posts_per_month) },
            { label: t("pricing.templates"), value: planType === "pro" ? t("pricing.unlimited") : planType === "free" ? t("pricing.basic") : t("pricing.advanced") },
            { label: t("pricing.analytics"), value: planType === "free" ? t("pricing.basic") : t("pricing.advanced") },
            { label: t("pricing.support"), value: planType === "free" ? "Community" : t("pricing.priority") },
            { label: t("pricing.aiImages"), value: String(dbPlan.ai_credits) },
            { label: t("pricing.xAutoPosts"), value: String(dbPlan.twitter_credits) },
          ],
          isRecommended: planType === "creator",
          badgeText: localizedBadge,
          badgeColor: dbPlan.badge_color || "#6366F1",
          activeUntil: dbPlan.active_until || undefined,
          isPromo: dbPlan.is_promo || false,
          ctaLabel: planType === "free" ? t("pricing.ctaFree") : t("pricing.ctaPaid"),
        });
      }
    }

    // ── 2. Custom plány z DB (viditelné, veřejné) ──────────────────────────
    const { data: customDbPlans } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_visible", true)
      .eq("is_custom", true)
      .eq("is_public", true);

    if (customDbPlans && customDbPlans.length > 0) {
      for (const dbPlan of customDbPlans) {
        // Filtr viditelnosti pro časově omezené plány
        // Pokud je nastaveno časové okno, plán se zobrazí jen v jeho rozsahu
        if (dbPlan.active_from && new Date(dbPlan.active_from) > now) continue; // Ještě nezačalo
        if (dbPlan.active_until && new Date(dbPlan.active_until) < now) continue; // Už skončilo

        let localizedName = dbPlan.name;
        if (locale === "en" && dbPlan.name_en) localizedName = dbPlan.name_en;
        else if (locale === "uk" && dbPlan.name_uk) localizedName = dbPlan.name_uk;

        let localizedDesc = dbPlan.description || "";
        if (locale === "en" && dbPlan.description_en) localizedDesc = dbPlan.description_en;
        else if (locale === "uk" && dbPlan.description_uk) localizedDesc = dbPlan.description_uk;

        let localizedBadge = dbPlan.badge_text || "";
        if (locale === "en" && dbPlan.badge_text_en) localizedBadge = dbPlan.badge_text_en;
        else if (locale === "uk" && dbPlan.badge_text_uk) localizedBadge = dbPlan.badge_text_uk;

        plans.push({
          id: dbPlan.id,
          name: localizedName,
          description: localizedDesc,
          priceCzk: dbPlan.price_czk / 100,
          priceEur: dbPlan.price_eur / 100,
          priceUsd: dbPlan.price_usd / 100,
          features: [
            { label: t("pricing.accounts"), value: dbPlan.max_accounts === -1 ? "∞" : String(dbPlan.max_accounts) },
            { label: t("pricing.postsPerMonth"), value: dbPlan.max_posts_per_month === null ? t("pricing.unlimited") : String(dbPlan.max_posts_per_month) },
            { label: t("pricing.aiImages"), value: String(dbPlan.ai_credits) },
            { label: t("pricing.xAutoPosts"), value: String(dbPlan.twitter_credits) },
          ],
          isRecommended: dbPlan.is_recommended || false,
          badgeText: localizedBadge,
          badgeColor: dbPlan.badge_color || "#6366F1",
          activeUntil: dbPlan.active_until || undefined,
          isPromo: dbPlan.is_promo || false,
          ctaLabel: t("pricing.ctaPaid"),
        });
      }
    }
  } catch {
    // DB nedostupná – použij fallback níže
    dbAvailable = false;
  }

  // Nouzová záloha: pokud se nepodařilo načíst master šablony z DB
  // (DB selhala nebo jsou všechny master plány skryté), použij hardcoded.
  const hasMasters = plans.some((p) => ["free", "creator", "pro"].includes(p.id));
  if (!hasMasters && !dbAvailable) {
    plans = [...buildFallbackPlans(t), ...plans.filter((p) => !["free", "creator", "pro"].includes(p.id))];
  }

  return (
    <section
      id="cenik"
      className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 md:py-28"
    >
      <Reveal className="mb-10">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("pricing.heading")}
        </h2>
        <p className="mt-3 max-w-[60ch] text-base text-muted-foreground">
          {t("pricing.subheading")}
        </p>
      </Reveal>

      <PricingClient
        plans={plans}
        locale={locale}
        texts={{
          free: t("pricing.free"),
          perMonth: t("pricing.perMonth"),
          recommended: t("pricing.recommended"),
        }}
      />
    </section>
  );
}
