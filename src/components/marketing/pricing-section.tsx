import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/marketing/reveal";
import { PricingClient } from "@/components/marketing/pricing-client";

// Public pricing section for the landing page. Server component builds the
// localized plan data (free/creator/pro, all 3 currencies, feature list) and
// hands it to the PricingClient island, which owns currency state + rendering.
interface Feature {
  label: string;
  value: string;
}

interface Plan {
  id: "free" | "creator" | "pro";
  name: string;
  description: string;
  priceCzk: number;
  priceEur: number;
  priceUsd: number;
  features: Feature[];
  isRecommended: boolean;
  ctaLabel: string;
}

export async function PricingSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });

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
