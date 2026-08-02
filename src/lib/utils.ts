import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize a media URL that is about to be sent to a third-party API
 * (Instagram, Facebook, …).
 *
 * Strips:
 *  - surrounding whitespace
 *  - a single matching pair of wrapping quotes / backticks that may have
 *    been added by copy-paste or by a terminal / markdown formatter
 *
 * Returns the cleaned URL or an empty string if the result is not a valid
 * absolute http(s) URL. The empty string is intentionally falsy so callers
 * can use it as a single guard.
 */
export function sanitizeMediaUrl(input: unknown): string {
  if (typeof input !== "string") return "";
  let s = input.trim();
  if (!s) return "";
  // Strip a single matching pair of wrapping quotes / backticks.
  const WRAP = ['"', "'", "`"] as const;
  for (const q of WRAP) {
    if (s.length >= 2 && s.startsWith(q) && s.endsWith(q)) {
      s = s.slice(1, -1).trim();
      break;
    }
  }
  // Final safety: only accept absolute http(s) URLs.
  if (!/^https?:\/\/\S+$/i.test(s)) return "";
  return s;
}

/**
 * Vypočítá relativní luminanci barvy podle WCAG specifikace.
 * Používá se pro určení kontrastu textu vůči pozadí odznaku.
 *
 * @param hex - HEX barva (např. "#6366F1" nebo "#ffffff")
 * @returns luminance 0-1 (0 = černá, 1 = bílá)
 */
function getLuminance(hex: string): number {
  // Normalizuj: odstraň #, doplň na 6 znaků
  let h = hex.replace(/^#/, "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (h.length !== 6) return 0; // fallback: považuj za tmavou

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  // sRGB → linear RGB (WCAG vzorec)
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Určí, zda je barva pozadí světlá, a vrátí odpovídající barvu textu
 * pro zajištění WCAG AA kontrastu.
 *
 * @param bgColor - HEX barva pozadí (např. "#6366F1", "#ffffff")
 * @returns "text-white" pro tmavé pozadí, "text-slate-900" pro světlé pozadí
 */
export function getContrastTextColor(bgColor: string): string {
  const luminance = getLuminance(bgColor);
  // WCAG threshold: luminance > 0.5 = světlé pozadí → tmavý text
  return luminance > 0.5 ? "text-slate-900" : "text-white";
}
