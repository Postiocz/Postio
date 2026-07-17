import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { readLegalDoc } from "@/lib/legal-docs";

/**
 * Server component rendering a legal document loaded from `doc/<fileName>`.
 *
 * Layout mirrors the existing `/privacy` page: a top bar with the Logo that
 * links back home, the document body, and the shared `SiteFooter`.
 * Krok 3 renders the raw text (line breaks preserved); structured formatting
 * (headings, bullets, date) is added in Krok 4.
 */
export async function LegalDocPage({
  locale,
  fileName,
}: {
  locale: string;
  fileName: string;
}) {
  const content = await readLegalDoc(fileName);
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground font-sans">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link
            href={`/${locale}/`}
            className="hover:opacity-80 transition-opacity"
          >
            <Logo className="text-2xl" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 pb-48 lg:py-24 lg:pb-32">
        <div className="mx-auto max-w-3xl">
          <article className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {content}
          </article>
        </div>
      </main>

      <SiteFooter locale={locale} />

      <div className="flex justify-center px-6 pb-16">
        <Link
          href={`/${locale}/`}
          className="relative z-10 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
        >
          {common("back")}
        </Link>
      </div>
    </div>
  );
}
