"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

// Custom spring-like easing per high-end skill (no linear / ease-in-out).
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function MarketingNav() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  const links = [
    { href: "#funkce", label: t("features") },
    { href: "#cenik", label: t("pricing") },
    { href: "#faq", label: t("faq") },
  ];

  // Lock body scroll while the mobile overlay is open; close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: EASE },
    },
  };

  return (
    <>
      {/* Floating glass pill nav: milk glass in light, glass in dark. Single line, <=80px. */}
      <header className="fixed left-1/2 top-6 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2">
        <nav
          aria-label="Marketing"
          className="flex h-16 items-center justify-between gap-4 rounded-full border border-black/10 bg-white/70 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-black/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] sm:px-6"
        >
          {/* Brand */}
          <Link href={`/${locale}`} aria-label="Postio" className="flex items-center">
            <Logo className="text-lg" />
          </Link>

          {/* Center links (desktop) */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right cluster: locale, theme, CTA, hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher />
            <ThemeToggle />

            <Link
              href={`/${locale}/login`}
              className="group hidden items-center gap-2 rounded-full bg-[#6366F1] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5457e5] active:scale-[0.98] md:inline-flex"
            >
              {t("login")}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Otevřít menu"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-black/5 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile full-screen glass overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col bg-white/85 backdrop-blur-3xl dark:bg-black/85 md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <Link href={`/${locale}`} onClick={() => setOpen(false)} aria-label="Postio">
                <Logo className="text-lg" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zavřít menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-black/5 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <motion.nav
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-1 flex-col items-center justify-center gap-2 pb-24"
            >
              {links.map((l) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  variants={itemVariants}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-6 py-3 text-2xl font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-white/90 dark:hover:text-white"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.div variants={itemVariants} className="mt-6">
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setOpen(false)}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-7 py-3.5 text-base font-medium text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all duration-300 active:scale-[0.98]"
                >
                  {t("login")}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
