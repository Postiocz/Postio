import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/marketing/reveal";
import { PricingClient } from "@/components/marketing/pricing-client";
import { createAdminClient } from "@/lib/supabase/server";

// Public pricing section for the landing page. Server component builds the
// localized plan data (free/creator/pro + custom plans from DB) and
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

export async function PricingSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });

  // Základní 3 plány (hardcoded s překlady)
  const plans: Plan[] = [
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

  // Načti vlastní plány z DB (viditelné, custom)
  try {
    const supabase = createAdminClient();
    const { data: customDbPlans } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_visible", true)
      .eq("is_custom", true)
      .eq("is_public", true);

    if (customDbPlans && customDbPlans.length > 0) {
      const now = new Date();

      for (const dbPlan of customDbPlans) {
        // Filtr viditelnosti pro časově omezené plány
        // Pokud je nastaveno časové okno, plán se zobrazí jen v jeho rozsahu
        if (dbPlan.active_from && new Date(dbPlan.active_from) > now) continue; // Ještě nezačalo
        if (dbPlan.active_until && new Date(dbPlan.active_until) < now) continue; // Už skončilo
        // Vyber lokalizovaný název podle locale
        let localizedName = dbPlan.name;
        if (locale === "en" && dbPlan.name_en) localizedName = dbPlan.name_en;
        else if (locale === "uk" && dbPlan.name_uk) localizedName = dbPlan.name_uk;

        // Vyber lokalizovaný popisek podle locale
        let localizedDesc = dbPlan.description || "";
        if (locale === "en" && dbPlan.description_en) localizedDesc = dbPlan.description_en;
        else if (locale === "uk" && dbPlan.description_uk) localizedDesc = dbPlan.description_uk;

        // Vyber lokalizovaný badge text podle locale
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
    // DB nedostupná – zobraz pouze základní plány
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
