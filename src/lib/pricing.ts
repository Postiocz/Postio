import type { Currency } from "@/components/marketing/currency-switcher";

export interface PriceValues {
  priceCzk: number;
  priceEur: number;
  priceUsd: number;
}

// Resolves the default display currency from the active locale: Czech users
// see CZK, everyone else (en/uk) defaults to EUR.
export function getDefaultCurrency(locale: string): Currency {
  return locale === "cs" ? "czk" : "eur";
}

// Formats a plan price for the selected currency. Free plans (amount 0) fall
// back to the localized "Free"/"Zdarma" label. CZK/EUR use "amount symbol",
// USD uses the leading "$" convention.
export function formatPrice(
  plan: PriceValues,
  currency: Currency,
  freeLabel: string
): { display: string; isFree: boolean } {
  const amount =
    currency === "czk" ? plan.priceCzk : currency === "eur" ? plan.priceEur : plan.priceUsd;

  if (amount === 0) return { display: freeLabel, isFree: true };

  const symbol = currency === "czk" ? "Kč" : currency === "eur" ? "€" : "$";
  const display =
    currency === "usd" ? `${symbol}${amount}` : `${amount} ${symbol}`;

  return { display, isFree: false };
}
