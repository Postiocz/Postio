"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type Currency = "czk" | "eur" | "usd";

const OPTIONS: { value: Currency; label: string }[] = [
  { value: "czk", label: "CZK" },
  { value: "eur", label: "EUR" },
  { value: "usd", label: "USD" },
];

// Pill-shaped segmented control with a glassmorphism surface. The active option
// gets the brand indigo fill; the rest stay muted until hovered.
export function CurrencySwitcher({
  value,
  onChange,
  className,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <div
      role="radiogroup"
      aria-label={t("currencyLabel")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1 backdrop-blur-xl",
        "dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              active
                ? "bg-[#6366F1] text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
