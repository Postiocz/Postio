import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "./src/lib/supabase/middleware";

const PUBLIC_STATIC_PATHS = new Set([
  "/tiktokjFgEI64FNgaNsEz5xTRu6LM09on0NdmD.txt",
]);

const intlMiddleware = createMiddleware({
  locales: ["cs", "en", "uk"],
  defaultLocale: "cs",
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (PUBLIC_STATIC_PATHS.has(url.pathname)) {
    return NextResponse.next();
  }

  // Redirect root "/" to default locale
  if (url.pathname === "/") {
    return NextResponse.redirect(new URL("/cs", request.url));
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
    restPath === "/" ||
    restPath.startsWith("/posts") ||
    restPath.startsWith("/calendar") ||
    restPath.startsWith("/accounts") ||
    restPath.startsWith("/templates") ||
    restPath.startsWith("/analytics") ||
    restPath.startsWith("/inbox") ||
    restPath.startsWith("/settings");

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
    "/((?!api|_next/static|_next/image|_vercel|auth/callback|favicon|icon|apple-icon|manifest|robots\\.txt|sitemap\\.xml).*)",
  ],
};
