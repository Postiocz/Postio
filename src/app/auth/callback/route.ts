import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type FacebookPagesResponse = {
  data?: Array<{
    id: string;
    name?: string;
    access_token?: string;
    picture?: { data?: { url?: string } };
    instagram_business_account?: { id: string };
  }>;
};

type InstagramBusinessResponse = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

async function graphFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v20.0${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph API ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

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

        try {
          const pages = await graphFetch<FacebookPagesResponse>(
            "/me/accounts",
            facebookToken,
            {
              fields:
                "id,name,access_token,instagram_business_account,picture{url}",
            }
          );

          const rowsToUpsert: Array<{
            user_id: string;
            platform: "facebook" | "instagram";
            account_name: string;
            access_token: string;
            platform_id: string | null;
            avatar_url?: string | null;
            is_active: boolean;
          }> = [];

          for (const page of pages.data ?? []) {
            if (!page.id || !page.access_token) continue;

            const pageName = page.name || "Facebook Page";
            const pageAvatarUrl = page.picture?.data?.url ?? null;

            rowsToUpsert.push({
              user_id: user.id,
              platform: "facebook",
              account_name: pageName,
              access_token: page.access_token,
              platform_id: page.id,
              avatar_url: pageAvatarUrl,
              is_active: true,
            });

            const igId = page.instagram_business_account?.id;
            if (!igId) continue;

            let ig: InstagramBusinessResponse | null = null;
            try {
              ig = await graphFetch<InstagramBusinessResponse>(
                `/${igId}`,
                page.access_token,
                { fields: "id,username,name,profile_picture_url" }
              );
            } catch (e) {
              console.error("Error fetching Instagram business details:", e);
            }

            const igName = ig?.username || ig?.name || pageName || "Instagram";
            const igAvatarUrl =
              ig?.profile_picture_url ?? pageAvatarUrl ?? null;

            rowsToUpsert.push({
              user_id: user.id,
              platform: "instagram",
              account_name: igName,
              access_token: page.access_token,
              platform_id: igId,
              avatar_url: igAvatarUrl,
              is_active: true,
            });
          }

          if (rowsToUpsert.length > 0) {
            const { error: upsertError } = await supabase
              .from("social_accounts")
              .upsert(rowsToUpsert, {
                onConflict: "user_id,platform,platform_id",
              });

            if (upsertError) {
              console.error("Error saving social accounts:", upsertError);
            }
          }
        } catch (graphError) {
          console.error("Error fetching Facebook pages:", graphError);
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
