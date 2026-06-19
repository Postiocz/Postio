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
