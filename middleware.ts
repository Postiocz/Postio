import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "./src/lib/supabase/middleware";

const PUBLIC_STATIC_PATHS = new Set([
  "/tiktokC7WkwZKqwTb7ZmDLLxxKtNvCfqLfbVBh.txt",
]);

const intlMiddleware = createMiddleware({
  locales: ["cs", "en", "uk"],
  defaultLocale: "cs",
  localePrefix: "always",
});

const LOCALES = ["cs", "en", "uk"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "cs";
// next-intl persists the last explicitly chosen locale in this cookie (v4 default name).
const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Mirror of next-intl's locale resolution so the custom `/` redirect and the
 * auth redirect pick the same language next-intl would: pathname prefix →
 * persisted cookie (last explicit choice) → browser Accept-Language → default.
 */
function detectLocale(request: NextRequest): Locale {
  const pathMatch = request.nextUrl.pathname.match(/^\/(cs|en|uk)(?:\/|$)/);
  if (pathMatch) return pathMatch[1] as Locale;

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  const acceptLanguage = request.headers.get("accept-language");
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
      if ((LOCALES as readonly string[]).includes(lang)) return lang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (PUBLIC_STATIC_PATHS.has(url.pathname)) {
    return NextResponse.next();
  }

  // Redirect root "/" to the language detected from browser / persisted cookie
  if (url.pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${detectLocale(request)}`, request.url)
    );
  }

  // Try to refresh the auth session via Supabase (graceful fallback)
  let session = null;
  let supabaseError = false;
  let authResponse = NextResponse.next({ request: { headers: request.headers } });

  // Check if Supabase is configured
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    supabaseKey &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !supabaseKey.includes("placeholder");

  if (isSupabaseConfigured) {
    try {
      const { supabase, getResponse } = createClient(request);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      session = user;
      authResponse = getResponse();
    } catch {
      // Supabase unavailable – proceed without auth
      supabaseError = true;
    }
  }

  const localeMatch = url.pathname.match(/^\/(cs|en|uk)(\/.*)?$/);
  const locale = localeMatch ? localeMatch[1] : "cs";
  const restPath = (localeMatch?.[2] ?? "") || "/";

  const isAuthRoute =
    restPath === "/login" ||
    restPath.startsWith("/login/") ||
    restPath === "/onboarding" ||
    restPath.startsWith("/onboarding/");

  const isDashboardRoute =
    restPath.startsWith("/dashboard") ||
    restPath.startsWith("/posts") ||
    restPath.startsWith("/calendar") ||
    restPath.startsWith("/accounts") ||
    restPath.startsWith("/templates") ||
    restPath.startsWith("/analytics") ||
    restPath.startsWith("/inbox") ||
    restPath.startsWith("/settings");

  // Authenticated user landing on the public homepage ("/") goes straight to the app.
  if (
    restPath === "/" &&
    !isAuthRoute &&
    session &&
    !supabaseError &&
    isSupabaseConfigured
  ) {
    return NextResponse.redirect(
      new URL(`/${detectLocale(request)}/dashboard`, request.url)
    );
  }

  if (
    isDashboardRoute &&
    !isAuthRoute &&
    !session &&
    !supabaseError &&
    isSupabaseConfigured
  ) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    authResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Run the i18n middleware and merge auth cookies
  const intlResponse = intlMiddleware(request);
  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });
  return intlResponse;
}

export const config = {
  matcher: [
    "/",
    "/(cs|en|uk)/:path*",
    "/((?!api|_next/static|_next/image|_vercel|auth/callback|favicon|icon|apple-icon|manifest|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
