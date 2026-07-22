import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import ReferralStats from "@/components/referral/referral-stats";

export const dynamic = "force-dynamic";

export default async function ReferralsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let referralCode: string | null = null;
  let totalReferrals = 0;
  let plan: string | null = null;
  let planExpiresAt: string | null = null;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("referral_code, plan, plan_expires_at")
      .eq("id", user.id)
      .single();

    referralCode = userData?.referral_code ?? null;
    plan = userData?.plan ?? null;
    planExpiresAt = userData?.plan_expires_at ?? null;

    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);

    totalReferrals = count ?? 0;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("referrals")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("referralsDescription")}
        </p>
      </div>

      <ReferralStats
        referralCode={referralCode}
        totalReferrals={totalReferrals}
        plan={plan}
        planExpiresAt={planExpiresAt}
        locale={locale}
      />
    </div>
  );
}
