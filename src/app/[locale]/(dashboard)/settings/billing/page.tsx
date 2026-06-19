import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { BillingCard } from "./billing-card";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  const dashboardT = await getTranslations({ locale, namespace: "dashboard" });

  let currentPlan = "free";

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase
      .from("users")
      .select("plan")
      .single();

    currentPlan = userData?.plan ?? "free";
  } catch {
    // Supabase unavailable
  }

  const plans = [
    {
      id: "free" as const,
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
      ],
      isCurrent: currentPlan === "free",
      isRecommended: false,
    },
    {
      id: "creator" as const,
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
      ],
      isCurrent: currentPlan === "creator",
      isRecommended: true,
    },
    {
      id: "pro" as const,
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
      ],
      isCurrent: currentPlan === "pro",
      isRecommended: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan) => (
          <BillingCard
            key={plan.id}
            plan={plan}
            translations={{
              current: t("current"),
              perMonth: t("perMonth"),
              subscribe: t("subscribe"),
              upgrade: t("upgrade"),
            }}
          />
        ))}
      </div>
    </div>
  );
}
