import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") || "/cs/accounts";

  let redirectPath = nextPath;

  if (code) {
    try {
      const localeMatch = request.headers
        .get("referer")
        ?.match(/\/(cs|en|uk)\//);
      const locale = localeMatch ? localeMatch[1] : "cs";

      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const redirectResponse = NextResponse.redirect(
        `${requestUrl.origin}${redirectPath}`
      );

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

      const { data: authData, error: authError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (authError) {
        return NextResponse.redirect(
          `${requestUrl.origin}/${locale}/accounts?error=${encodeURIComponent(authError.message)}`
        );
      }

      const user = authData?.session?.user;

      // If this is a Facebook OAuth callback, save the provider access token
      if (authData?.session?.provider_token && user) {
        const facebookToken = authData.session.provider_token;

        // Fetch Facebook profile info via Graph API
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/me?fields=id,name,picture&type=oauth&access_token=${facebookToken}`
          );
          const profileData = await profileRes.json();

          // Fetch Instagram business account linked to this Facebook account
          const pagesRes = await fetch(
            `https://graph.facebook.com/me/accounts?fields=id,name,instagram_account&access_token=${facebookToken}`
          );
          const pagesData = await pagesRes.json();

          // Save Facebook account
          const { error: fbError } = await supabase
            .from("social_accounts")
            .insert({
              user_id: user.id,
              platform: "facebook",
              account_name: profileData.name || "Facebook Account",
              access_token: facebookToken,
              platform_id: profileData.id || null,
              is_active: true,
            });

          if (fbError) {
            console.error("Error saving Facebook account:", fbError);
          }

          // Save Instagram accounts linked to Facebook pages
          if (pagesData?.data?.length > 0) {
            for (const page of pagesData.data) {
              if (page.instagram_account) {
                const { error: igError } = await supabase
                  .from("social_accounts")
                  .insert({
                    user_id: user.id,
                    platform: "instagram",
                    account_name:
                      page.instagram_account.name ||
                      page.name ||
                      "Instagram Account",
                    access_token: facebookToken,
                    platform_id:
                      page.instagram_account.id || page.id || null,
                    is_active: true,
                  });

                if (igError) {
                  console.error("Error saving Instagram account:", igError);
                }
              }
            }
          }
        } catch (graphError) {
          console.error("Error fetching Facebook profile:", graphError);
        }
      }

      // Determine final redirect path
      const finalRedirectPath = localeMatch
        ? `/${locale}${nextPath.startsWith(`/${locale}`) ? nextPath.slice(locale.length + 1) : nextPath.replace(/^\//, "/")}`
        : nextPath;

      // Check if 2FA is enabled for this user
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("two_factor_enabled")
          .eq("id", user.id)
          .single();

        if (userData?.two_factor_enabled) {
          return NextResponse.redirect(
            `${requestUrl.origin}/${locale}/login/verify-2fa`
          );
        }
      }

      return NextResponse.redirect(
        `${requestUrl.origin}${finalRedirectPath}`
      );
    } catch {
      // Fall through to redirect without session
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
}
