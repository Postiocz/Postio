import { getTranslations } from "next-intl/server";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing.footer" });

  const links = [
    { label: t("linkFeatures"), href: "#funkce" },
    { label: t("linkPricing"), href: "#cenik" },
    { label: t("linkFaq"), href: "#faq" },
    { label: t("linkLogin"), href: `/${locale}/login` },
  ];

  return (
    <footer className="relative mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 md:pb-14">
      {/* Newsletter card */}
      <div className="mx-auto mb-16 max-w-xl rounded-[20px] border border-border bg-card/60 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-10">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          {t("newsletterTitle")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("newsletterDesc")}
        </p>
        <NewsletterForm />
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Postio. {t("copyright")}
        </p>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
