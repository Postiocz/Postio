"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * AuthNav — floating glass pill nav for the login/onboarding pages.
 *
 * Simplified variant of MarketingNav: brand left, locale + theme toggles right.
 * No marketing links, no login CTA (we are already on auth pages).
 */
export function AuthNav() {
  const locale = useLocale();

  return (
    <header className="fixed left-1/2 top-6 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2">
      <nav
        aria-label="Auth navigation"
        className="flex h-16 items-center justify-between gap-4 rounded-full border border-black/10 bg-white/70 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-black/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] sm:px-6"
      >
        {/* Brand */}
        <Link href={`/${locale}`} aria-label="Postio" className="flex items-center">
          <Logo className="text-lg" />
        </Link>

        {/* Right cluster: locale + theme */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
