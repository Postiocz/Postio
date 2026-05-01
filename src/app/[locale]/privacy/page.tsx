import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center">
          <Link href={`/${locale}/`} className="text-xl font-bold text-primary">
            {common("appName")}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("intro")}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("dataWeCollect")}
            </h2>
            <p className="text-muted-foreground">{t("dataWeCollectDesc")}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("howWeUse")}
            </h2>
            <p className="text-muted-foreground">{t("howWeUseDesc")}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("cookies")}
            </h2>
            <p className="text-muted-foreground">{t("cookiesDesc")}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("dataSharing")}
            </h2>
            <p className="text-muted-foreground">{t("dataSharingDesc")}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("yourRights")}
            </h2>
            <p className="text-muted-foreground">{t("yourRightsDesc")}</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {t("contact")}
            </h2>
            <p className="text-muted-foreground">
              {t("contactDesc")}{" "}
              <a
                href="mailto:postio.cz@gmail.com"
                className="text-primary underline underline-offset-2"
              >
                postio.cz@gmail.com
              </a>
            </p>
          </section>

          <p className="text-sm text-muted-foreground">
            {t("lastUpdated")}: 1. května 2026
          </p>

          <div className="flex justify-center pt-4">
            <Link
              href={`/${locale}/`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {common("back")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
