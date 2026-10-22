import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies, headers } from "next/headers";

// Locale-aware title / description / OpenGraph / Twitter metadata is set in
// [locale]/layout.tsx (strings live in messages/*.json under `Metadata`).
// This static fallback only covers non-localized roots (e.g. "/" pre-redirect).
export const metadata: Metadata = {
  metadataBase: new URL("https://postio-app.cz"),
  title: "Postio",
  applicationName: "Postio",
};

const LOCALES = ["cs", "en", "uk"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the active locale for `<html lang>`.
 * Order: next-intl middleware request header (authoritative in build/prod) →
 * persisted NEXT_LOCALE cookie (last explicit switcher choice) →
 * browser Accept-Language → `cs`. The cookie/header fallback also covers dev,
 * where the middleware does not run (Next --webpack, see CHANGELOG).
 */
async function detectLocale(): Promise<Locale> {
  const h = await headers();
  const fromHeader = h.get("X-NEXT-INTL-LOCALE");
  if (isLocale(fromHeader)) return fromHeader;

  const c = await cookies();
  const fromCookie = c.get("NEXT_LOCALE")?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const acceptLanguage = h.get("accept-language");
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag, qParam] = part.trim().split(";");
        const q = qParam?.startsWith("q=") ? parseFloat(qParam.slice(2)) : 1;
        return {
          lang: tag.trim().toLowerCase().split("-")[0],
          q: Number.isNaN(q) ? 0 : q,
        };
      })
      .sort((a, b) => b.q - a.q)
      .map(({ lang }) => lang);
    for (const lang of languages) {
      if (isLocale(lang)) return lang;
    }
  }

  return "cs";
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Elegant serif used ONLY for marketing headings & prices (premium feel).
// In-app UI (dashboard/billing) stays sans-serif via --font-sans.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-serif",
  display: "swap",
});

async function getThemeCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get("theme")?.value;
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeCookie = await getThemeCookie();
  const isDark = themeCookie !== "light";
  const locale = await detectLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable} ${isDark ? "dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var t;
                try{t=document.cookie.match(/theme=([^;]+)/)}catch(e){}
                var theme=t?t[1]:"system";
                if(theme==="system"){
                  theme=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";
                }
                if(theme==="dark"){
                  document.documentElement.classList.add("dark");
                }else{
                  document.documentElement.classList.remove("dark");
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
