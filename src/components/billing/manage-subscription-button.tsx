"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManageSubscriptionButton() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[20px] border border-border bg-card/40 backdrop-blur-xl p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("manageSubscription")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manageSubscriptionDesc")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium",
            "bg-indigo-500 text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)]",
            "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "hover:bg-indigo-600 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <span>{loading ? "..." : t("manageSubscription")}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
