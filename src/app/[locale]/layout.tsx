import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "sonner";
import type { Metadata } from "next";

/** OpenGraph `og:locale` value per app locale */
const OG_LOCALES: Record<string, string> = {
  cs: "cs_CZ",
  en: "en_US",
  uk: "uk_UA",
};

/**
 * Locale-aware document metadata (title, description, OpenGraph, Twitter).
 * Strings live in messages/*.json under the `Metadata` namespace, so the
 * browser tab title and share cards follow the active locale on every route.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("title");
  const description = t("description");

  return {
    title: { default: title, template: "%s | Postio" },
    description,
    openGraph: {
      type: "website",
      url: "https://postio-app.cz",
      siteName: "Postio",
      title,
      description,
      locale: OG_LOCALES[locale] ?? "cs_CZ",
      images: [
        {
          url: `/hero-mockup_${locale}.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/hero-mockup_${locale}.png`],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <CookieConsent />
        <Toaster position="top-center" richColors />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
