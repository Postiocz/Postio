import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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
  const nextParam = requestUrl.searchParams.get("next") || "/accounts";

  const localeFromNext = nextParam.match(/^\/(cs|en|uk)(?:\/|$)/)?.[1];
  const localeFromReferer = request.headers
    .get("referer")
    ?.match(/\/(cs|en|uk)(?:\/|$)/)?.[1];
  const locale = localeFromNext ?? localeFromReferer ?? "cs";

  const normalizeNext = (raw: string) => {
    if (!raw) return `/${locale}/accounts`;
    let path = raw;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        if (parsed.origin !== requestUrl.origin) return `/${locale}/accounts`;
        path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        return `/${locale}/accounts`;
      }
    }

    if (!path.startsWith("/")) return `/${locale}/accounts`;
    if (path === "/") return `/${locale}`;
    if (path.startsWith("/auth/callback")) return `/${locale}/accounts`;

    const hasLocale = /^\/(cs|en|uk)(?:\/|$)/.test(path);
    if (hasLocale) return path;
    return `/${locale}${path}`;
  };

  const next = normalizeNext(nextParam);

  if (!code) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let response = NextResponse.next({ request: { headers: request.headers } });
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
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: authData, error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    const errorResponse = NextResponse.redirect(
      new URL(`/${locale}/login?error=${encodeURIComponent(authError.message)}`, request.url)
    );
    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie);
    });
    return errorResponse;
  }

  const session = authData?.session;
  const user = session?.user;

  if (session?.provider_token && user) {
    const facebookUserToken = session.provider_token;

    try {
      const pagesFields =
        "id,name,access_token,instagram_business_account,picture{url}";

      const pages = await graphFetch<FacebookPagesResponse>(
        "/me/accounts",
        facebookUserToken,
        { fields: pagesFields }
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
        const pageAccessToken = page.access_token;

        rowsToUpsert.push({
          user_id: user.id,
          platform: "facebook",
          account_name: pageName,
          access_token: pageAccessToken,
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
            pageAccessToken,
            { fields: "id,username,name,profile_picture_url" }
          );
        } catch {
          ig = null;
        }

        const igName = ig?.username || ig?.name || pageName || "Instagram";
        const igAvatarUrl = ig?.profile_picture_url ?? pageAvatarUrl ?? null;

        rowsToUpsert.push({
          user_id: user.id,
          platform: "instagram",
          account_name: igName,
          access_token: pageAccessToken,
          platform_id: igId,
          avatar_url: igAvatarUrl,
          is_active: true,
        });
      }

      if (rowsToUpsert.length > 0) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin
          .from("social_accounts")
          .upsert(rowsToUpsert, {
            onConflict: "user_id,platform,platform_id",
          });
      }
    } catch {
    }
  }

  let finalNext = next;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("two_factor_enabled")
      .eq("id", user.id)
      .single();

    if (userData?.two_factor_enabled) {
      finalNext = `/${locale}/login/verify-2fa`;
    }
  }

  const redirectResponse = NextResponse.redirect(new URL(finalNext, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
