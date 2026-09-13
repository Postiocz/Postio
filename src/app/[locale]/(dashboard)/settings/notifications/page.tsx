import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import NotificationsForm from "./notifications-form";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let emailLowCreditAlert = false;
  let emailWeeklySummary = false;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("email_low_credit_alert, email_weekly_summary")
      .eq("id", user.id)
      .single();

    if (userData) {
      emailLowCreditAlert = userData.email_low_credit_alert ?? false;
      emailWeeklySummary = userData.email_weekly_summary ?? false;
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("notifications")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("notificationsDescription")}
        </p>
      </div>

      <NotificationsForm
        emailLowCreditAlert={emailLowCreditAlert}
        emailWeeklySummary={emailWeeklySummary}
        labels={{
          saved: t("notificationsSaved"),
          notificationsSection: t("notificationsSection"),
          notificationsSectionDescription: t("notificationsSectionDescription"),
          lowCreditAlert: t("lowCreditAlert"),
          lowCreditAlertDescription: t("lowCreditAlertDescription"),
          weeklySummary: t("weeklySummary"),
          weeklySummaryDescription: t("weeklySummaryDescription"),
        }}
      />
    </div>
  );
}