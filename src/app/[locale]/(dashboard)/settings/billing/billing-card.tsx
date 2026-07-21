"use client";

import React, { useTransition } from "react";
import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/pricing";
import type { Currency } from "@/components/marketing/currency-switcher";
import { cn } from "@/lib/utils";

interface Feature {
  label: string;
  value: string;
}

export interface Plan {
  id: "free" | "creator" | "pro";
  name: string;
  description: string;
  priceCzk: number;
  priceEur: number;
  priceUsd: number;
  features: Feature[];
  isCurrent: boolean;
  isRecommended: boolean;
}

interface BillingCardProps {
  plan: Plan;
  locale: string;
  currency?: Currency;
  translations: {
    current: string;
    recommended: string;
    perMonth: string;
    subscribe: string;
    upgrade: string;
    free: string;
  };
}

const iconMap: Record<string, React.ElementType> = {
  free: Sparkles,
  creator: Zap,
  pro: Crown,
};

export function BillingCard({ plan, locale, currency = "eur", translations }: BillingCardProps) {
  const Icon = iconMap[plan.id] || Sparkles;
  const [isPending, startTransition] = useTransition();

  const { display, isFree } = formatPrice(plan, currency, translations.free);

  const handleCheckout = () => {
    if (plan.isCurrent) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: plan.id, locale, currency }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        // Silent fail
      }
    });
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[24px] border p-8 transition-all duration-300",
        "bg-card/40 backdrop-blur-xl border-white/5",
        plan.isRecommended && "border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)]",
        plan.isCurrent && "ring-1 ring-indigo-500/20"
      )}
    >
      {/* Recommended badge */}
      {plan.isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <Check className="h-3 w-3" />
            {translations.recommended}
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {plan.isCurrent && !plan.isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <Check className="h-3 w-3" />
            {translations.current}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            plan.isRecommended
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-white/5 text-muted-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">{display}</span>
          {!isFree && (
            <span className="text-sm text-muted-foreground">{translations.perMonth}</span>
          )}
        </div>
      </div>

      {/* Features list */}
      <div className="flex-1 space-y-3 mb-8">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="flex-1">
              <span className="text-sm text-muted-foreground">{feature.label}:</span>
              <span className="ml-2 text-sm font-medium">{feature.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <Button
        variant={plan.isCurrent ? "outline" : plan.isRecommended ? "default" : "outline"}
        className={cn(
          "w-full rounded-xl",
          plan.isRecommended && "bg-indigo-500 hover:bg-indigo-600 text-white"
        )}
        disabled={plan.isCurrent || isPending}
        onClick={handleCheckout}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : plan.isCurrent ? (
          translations.current
        ) : plan.id === "free" ? (
          translations.subscribe
        ) : (
          translations.upgrade
        )}
      </Button>
    </div>
  );
}
