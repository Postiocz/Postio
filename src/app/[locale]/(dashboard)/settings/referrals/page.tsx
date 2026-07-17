import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

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

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    referralCode = userData?.referral_code ?? null;

    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);

    totalReferrals = count ?? 0;
  }

  const referralLink = referralCode
    ? `https://postio-app.cz/${locale}/login?ref=${referralCode}`
    : "";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("referrals")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("referralsDescription")}
        </p>
      </div>

      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/60 dark:bg-card/30 backdrop-blur-md p-4 sm:p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t("yourLink")}</p>
          <input
            readOnly
            value={referralLink}
            className="mt-2 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 px-3 py-2 text-sm dark:bg-black/40"
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("totalReferrals")}</p>
          <p className="text-2xl font-bold">{totalReferrals}</p>
        </div>
      </div>
    </div>
  );
}
