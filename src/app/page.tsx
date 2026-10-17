import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

const LOCALES = ["cs", "en", "uk"] as const;
const DEFAULT_LOCALE = "cs";
const LOCALE_COOKIE = "NEXT_LOCALE";

// Mirror of middleware `detectLocale`: persisted cookie (last explicit choice)
// → browser Accept-Language → default. Keeps the root fallback page consistent
// with the middleware redirect (which runs first on production).
function pickLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null
): string {
  if (cookieValue && (LOCALES as readonly string[]).includes(cookieValue)) {
    return cookieValue;
  }
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag, qParam] = part.trim().split(";");
        const q =
          qParam && qParam.startsWith("q=") ? parseFloat(qParam.slice(2)) : 1;
        return {
          lang: tag.trim().toLowerCase().split("-")[0],
          q: Number.isNaN(q) ? 0 : q,
        };
      })
      .sort((a, b) => b.q - a.q)
      .map(({ lang }) => lang);
    for (const lang of languages) {
      if ((LOCALES as readonly string[]).includes(lang)) return lang;
    }
  }
  return DEFAULT_LOCALE;
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerStore.get("accept-language")
  );
  redirect(`/${locale}`);
}
