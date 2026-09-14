import type { ValidationIssue } from "./platform-policies";

/**
 * Resolve the localized message for a media validation issue.
 *
 * `t` is the next-intl `useTranslations("posts")` function. The validator
 * returns `code` + `params` (see platform-policies.ts) and a `message`
 * English fallback used by the server (publish.ts has no i18n).
 *
 * next-intl returns the key literal when a key is missing, so a missing
 * `mediaPolicy_<code>` translation falls back to `issue.message`.
 */
export function mediaIssueText(
  t: (key: string, params?: Record<string, string | number>) => string,
  issue: ValidationIssue,
): string {
  const key = `mediaPolicy_${issue.code}`;
  const translated = t(key, issue.params ?? {});
  // next-intl falls back to the key string for missing keys.
  if (translated && !translated.startsWith(`${key}`)) {
    return translated;
  }
  return issue.message;
}