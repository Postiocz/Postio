import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { CookieSettingsLink } from "@/components/marketing/cookie-settings-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/ui/logo";

type FooterLink = { label: string; href: string };

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-[#A89FFF] transition-colors hover:text-[#6C47FF]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "footer" });

  const productLinks: FooterLink[] = [
    { label: t("product.features"), href: `/${locale}/#funkce` },
    { label: t("product.pricing"), href: `/${locale}/#cenik` },
  ];

  const supportLinks: FooterLink[] = [
    { label: t("support.faq"), href: `/${locale}/#faq` },
    { label: t("support.contact"), href: "mailto:info@postio-app.cz" },
  ];

  const legalLinks: FooterLink[] = [
    { label: t("legal.privacy"), href: `/${locale}/privacy-policy` },
    { label: t("legal.terms"), href: `/${locale}/terms-of-service` },
    { label: t("legal.dpa"), href: `/${locale}/dpa` },
    {
      label: t("legal.aiTransparency"),
      href: `/${locale}/ai-transparency-notice`,
    },
  ];

  const appLinks: FooterLink[] = [
    { label: t("app.login"), href: `/${locale}/login` },
    { label: t("app.register"), href: `/${locale}/login` },
  ];

  return (
    <footer className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 md:pt-28">
      {/* Newsletter card (kept from previous footer) */}
      <div className="mx-auto mb-16 max-w-xl rounded-[20px] border border-border bg-card/60 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-10">
        <h3 className="text-xl font-bold tracking-tight text-foreground font-serif">
          {t("newsletterTitle")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("newsletterDesc")}
        </p>
        <NewsletterForm />
      </div>

      {/* Four-column link grid */}
      <div className="grid grid-cols-1 gap-10 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <FooterColumn title={t("productTitle")} links={productLinks} />
        <FooterColumn title={t("supportTitle")} links={supportLinks} />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            {t("legalTitle")}
          </h3>
          <ul className="mt-4 space-y-3">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-[#A89FFF] transition-colors hover:text-[#6C47FF]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsLink className="text-left text-sm text-[#A89FFF] transition-colors hover:text-[#6C47FF]" />
            </li>
          </ul>
        </div>
        <FooterColumn title={t("appTitle")} links={appLinks} />
      </div>

      {/* Bottom bar */}
      <div className="mt-12 flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <Logo className="text-xl" />
          <p className="text-xs text-muted-foreground">{t("copyright")}</p>
          <p className="text-xs text-muted-foreground">{t("tagline")}</p>
        </div>

        <p className="text-xs text-muted-foreground">{t("madeInCz")}</p>

        <Suspense fallback={null}>
          <LocaleSwitcher />
        </Suspense>
      </div>
    </footer>
  );
}
