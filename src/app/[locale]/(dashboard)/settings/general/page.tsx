import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import GeneralForm from "./general-form";

export default async function GeneralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  const commonT = await getTranslations({ locale, namespace: "common" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let organizationName = "";
  let createdAt = "";

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("organization_name, created_at")
      .eq("id", user.id)
      .single();

    if (userData) {
      organizationName = userData.organization_name ?? "";

      if (userData.created_at) {
        const date = new Date(userData.created_at);
        const formatter = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "uk" ? "uk-UA" : "en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        createdAt = formatter.format(date);
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("general")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("generalDescription")}
        </p>
      </div>

      <GeneralForm
        organizationName={organizationName}
        createdAt={createdAt}
        labels={{
          creationDate: t("creationDate"),
          creationDateValue: createdAt,
          organizationName: t("organizationName"),
          organizationNamePlaceholder: t("organizationNamePlaceholder"),
          saved: t("savedGeneral"),
          saving: commonT("loading"),
          save: commonT("save"),
        }}
      />
    </div>
  );
}
