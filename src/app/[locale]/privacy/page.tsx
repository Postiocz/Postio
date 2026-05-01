import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground font-sans">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link href={`/${locale}/`} className="hover:opacity-80 transition-opacity">
            <Logo className="text-2xl" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 lg:py-24">
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {t("title")}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t("intro")}
            </p>
          </div>

          <div className="space-y-10">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("dataWeCollect")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("dataWeCollectDesc")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("howWeUse")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("howWeUseDesc")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("cookies")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("cookiesDesc")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("dataSharing")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("dataSharingDesc")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("yourRights")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("yourRightsDesc")}
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                {t("contact")}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {t("contactDesc")}{" "}
                <a
                  href="mailto:postio.cz@gmail.com"
                  className="text-primary font-medium underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  postio.cz@gmail.com
                </a>
              </p>
            </section>
          </div>

          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              {t("lastUpdated")}: 1. května 2026
            </p>
          </div>

          <div className="flex justify-center pt-8">
            <Link
              href={`/${locale}/`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
            >
              {common("back")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
