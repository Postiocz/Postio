import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://postio-app.cz"),
  title: {
    default: "Postio – Tvůj chytrý AI plánovač sociálních sítí",
    template: "%s | Postio",
  },
  description:
    "Plánuj, publikuj a analyzuj příspěvky na Facebook, Instagram, LinkedIn a TikTok z jednoho místa s pomocí AI Vision.",
  applicationName: "Postio",
  openGraph: {
    type: "website",
    url: "https://postio-app.cz",
    siteName: "Postio",
    title: "Postio – Tvůj chytrý AI plánovač sociálních sítí",
    description:
      "Plánuj, publikuj a analyzuj příspěvky na Facebook, Instagram, LinkedIn a TikTok z jednoho místa s pomocí AI Vision.",
    images: [
      {
        url: "/hero-mockup_cs.png",
        width: 1200,
        height: 630,
        alt: "Postio – AI plánovač sociálních sítí",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Postio – Tvůj chytrý AI plánovač sociálních sítí",
    description:
      "Plánuj, publikuj a analyzuj příspěvky na Facebook, Instagram, LinkedIn a TikTok z jednoho místa s pomocí AI Vision.",
    images: ["/hero-mockup_cs.png"],
  },
};

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

  return (
    <html lang="cs" className={`${inter.variable} ${playfair.variable} ${isDark ? "dark" : ""}`} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
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
