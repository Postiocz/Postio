"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

export function NewsletterForm() {
  const t = useTranslations("landing.footer");

  return (
    <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
      <input
        type="email"
        placeholder={t("newsletterPlaceholder")}
        className="flex-1 rounded-full border border-border bg-background/50 px-5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#6366F1]/50 focus:outline-none focus:ring-1 focus:ring-[#6366F1]/30"
      />
      <button
        type="submit"
        className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#6366F1] px-5 py-2.5 text-sm font-medium text-white shadow-[0_2px_12px_rgba(99,102,241,0.3)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5457e5] active:scale-[0.98]"
      >
        {t("newsletterCta")}
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    </form>
  );
}
