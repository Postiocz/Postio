import { notFound } from "next/navigation";

export const locales = ["cs", "en", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "cs";

export function getLocale(locale: string): Locale {
  if (!locales.includes(locale as Locale)) notFound();
  return locale as Locale;
}
