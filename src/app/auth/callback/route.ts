import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  let redirectPath = "/cs/accounts";

  if (code) {
    try {
      // Create the redirect response first, then pass it to Supabase client
      // so cookies are set on the actual response object
      const localeMatch = request.headers
        .get("referer")
        ?.match(/\/(cs|en|uk)\//);
      const locale = localeMatch ? localeMatch[1] : "cs";
      redirectPath = `/${locale}/accounts`;

      const redirectResponse = NextResponse.redirect(
        `${requestUrl.origin}${redirectPath}`
      );

      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        key!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                redirectResponse.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      await supabase.auth.exchangeCodeForSession(code);

      // Check if 2FA is enabled for this user
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("two_factor_enabled")
          .eq("id", user.user.id)
          .single();

        if (userData?.two_factor_enabled) {
          return NextResponse.redirect(
            `${requestUrl.origin}/${locale}/login/verify-2fa`
          );
        }
      }

      return redirectResponse;
    } catch {
      // Fall through to redirect without session
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
}
