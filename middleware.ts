import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "./src/lib/supabase/middleware";

const intlMiddleware = createMiddleware({
  locales: ["cs", "en", "uk"],
  defaultLocale: "cs",
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Redirect root "/" to default locale
  if (url.pathname === "/") {
    return NextResponse.redirect(new URL("/cs/login", request.url));
  }

  // Try to refresh the auth session via Supabase (graceful fallback)
  let session = null;
  let authResponse = NextResponse.next({ request });

  try {
    const { supabase, response } = createClient(request);
    const { data } = await supabase.auth.getSession();
    session = data.session;
    authResponse = response;
  } catch {
    // Supabase unavailable – proceed without auth
  }

  // If no session and not on a public route, redirect to login
  const publicPatterns = ["/login", "/api"];
  const isPublicRoute = publicPatterns.some((pattern) =>
    url.pathname.includes(pattern)
  );

  if (!session && !isPublicRoute) {
    const localeMatch = url.pathname.match(/^\/(cs|en|uk)/);
    const locale = localeMatch ? localeMatch[1] : "cs";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Copy auth cookies from the Supabase response
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
    "/((?!api|_next/static|_next/image|_vercel|auth/callback|favicon).*)",
  ],
};
