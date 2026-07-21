"use client";

import { useState } from "react";
import { BillingCard, type Plan } from "./billing-card";
import { CurrencySwitcher, type Currency } from "@/components/marketing/currency-switcher";
import { getDefaultCurrency } from "@/lib/pricing";

// Client island for the billing page: owns the selected-currency state
// and renders the switcher above the card grid. Cards stay sans-serif
// (in-app UI), only the displayed price value reacts to the currency.
export function BillingClient({
  plans,
  locale,
  translations,
}: {
  plans: Plan[];
  locale: string;
  translations: {
    current: string;
    recommended: string;
    perMonth: string;
    subscribe: string;
    upgrade: string;
    free: string;
  };
}) {
  const [currency, setCurrency] = useState<Currency>(getDefaultCurrency(locale));

  return (
    <>
      <div className="flex justify-center">
        <CurrencySwitcher value={currency} onChange={setCurrency} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan) => (
          <BillingCard
            key={plan.id}
            plan={plan}
            locale={locale}
            currency={currency}
            translations={translations}
          />
        ))}
      </div>
    </>
  );
}
