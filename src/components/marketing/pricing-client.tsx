"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { CurrencySwitcher, type Currency } from "@/components/marketing/currency-switcher";
import { formatPrice, getDefaultCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface ClientPlan {
  id: "free" | "creator" | "pro";
  name: string;
  description: string;
  priceCzk: number;
  priceEur: number;
  priceUsd: number;
  features: { label: string; value: string }[];
  isRecommended: boolean;
  ctaLabel: string;
}

const iconMap: Record<string, React.ElementType> = {
  free: Sparkles,
  creator: Zap,
  pro: Crown,
};

// Client island for the public pricing grid: owns the selected-currency state
// and drives the CurrencySwitcher + per-card price formatting.
export function PricingClient({
  plans,
  locale,
  texts,
}: {
  plans: ClientPlan[];
  locale: string;
  texts: {
    free: string;
    perMonth: string;
    recommended: string;
  };
}) {
  const [currency, setCurrency] = useState<Currency>(getDefaultCurrency(locale));

  return (
    <>
      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan, i) => {
          const Icon = iconMap[plan.id] || Sparkles;
          const { display, isFree } = formatPrice(plan, currency, texts.free);
          return (
            <Reveal key={plan.id} delay={i * 0.08} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-[20px] border p-8 backdrop-blur-xl transition-all duration-300",
                  "border-border bg-card/40",
                  plan.isRecommended
                    ? "border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.12)] lg:-translate-y-2"
                    : "hover:border-indigo-500/20"
                )}
              >
                {plan.isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                      <Check className="h-3 w-3" />
                      {texts.recommended}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        plan.isRecommended
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-white/5 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-bold tracking-tight text-foreground">
                      {display}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">{texts.perMonth}</span>
                    )}
                  </div>
                </div>

                <div className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">{feature.label}:</span>
                        <span className="ml-2 text-sm font-medium text-foreground">
                          {feature.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/${locale}/login`}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                    plan.isRecommended
                      ? "bg-indigo-500 text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:bg-indigo-600"
                      : "border border-black/15 text-slate-700 hover:bg-black/5 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5"
                  )}
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
