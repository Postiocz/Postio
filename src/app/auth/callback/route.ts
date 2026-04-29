import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  let redirectPath = "/cs";

  if (code) {
    try {
      // Create the redirect response first, then pass it to Supabase client
      // so cookies are set on the actual response object
      const localeMatch = request.headers
        .get("referer")
        ?.match(/\/(cs|en|uk)\//);
      const locale = localeMatch ? localeMatch[1] : "cs";
      redirectPath = `/${locale}`;

      const redirectResponse = NextResponse.redirect(
        `${requestUrl.origin}${redirectPath}`
      );

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      return redirectResponse;
    } catch {
      // Fall through to redirect without session
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
}
