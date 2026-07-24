import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "sonner";
import type { Metadata } from "next";

/** Locale-aware OpenGraph / Twitter metadata */
const localeMeta: Record<string, { title: string; description: string }> = {
  cs: {
    title: "Postio – Tvůj chytrý AI plánovač sociálních sítí",
    description:
      "Plánuj, publikuj a analyzuj příspěvky na Facebook, Instagram, LinkedIn a TikTok z jednoho místa s pomocí AI Vision.",
  },
  en: {
    title: "Postio – Your Smart AI Social Media Scheduler",
    description:
      "Plan, publish, and analyze posts on Facebook, Instagram, LinkedIn, and TikTok from one place with AI Vision.",
  },
  uk: {
    title: "Postio – Твій розумний AI планувальник соціальних мереж",
    description:
      "Плануй, публікуй та аналізуй дописи на Facebook, Instagram, LinkedIn і TikTok в одному місці з AI Vision.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = localeMeta[locale] ?? localeMeta.cs;

  return {
    openGraph: {
      type: "website",
      url: "https://postio-app.cz",
      siteName: "Postio",
      title: meta.title,
      description: meta.description,
      locale: locale === "cs" ? "cs_CZ" : locale === "uk" ? "uk_UA" : "en_US",
      images: [
        {
          url: `/hero-mockup_${locale}.png`,
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
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
