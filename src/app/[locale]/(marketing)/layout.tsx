import { GeistSans } from "geist/font/sans";
import { MarketingNav } from "@/components/marketing/marketing-nav";

// Marketing layout: public landing shell.
// Inherits NextIntl + ThemeProvider + CookieConsent from the parent [locale] layout.
// Brand font (Geist) applied to the whole marketing section per the design read.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${GeistSans.variable} ${GeistSans.className} relative min-h-[100dvh] bg-background text-foreground antialiased`}
    >
      {/* Theme-adaptive background: 24x24 grid + indigo glow (subtler in light, stronger in dark) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
        <div className="absolute left-1/2 top-[-12%] h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[160px] dark:bg-indigo-500/35" />
      </div>

      <div className="relative z-10">
        <MarketingNav />
        {children}
      </div>
    </div>
  );
}
