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
  let supabaseError = false;
  let authResponse = NextResponse.next({ request });

  // Check if Supabase is configured
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  try {
    const { supabase, response } = createClient(request);
    const { data: { user } } = await supabase.auth.getUser();
    session = user;
    authResponse = response;
  } catch {
    // Supabase unavailable – proceed without auth
    supabaseError = true;
  }

  // If no session and not on a public route, redirect to login
  // But skip redirect if Supabase is not configured or errored (dev mode)
  const publicPatterns = ["/login", "/api"];
  const isPublicRoute = publicPatterns.some((pattern) =>
    url.pathname.includes(pattern)
  );

  if (!session && !isPublicRoute && !supabaseError && isSupabaseConfigured) {
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
