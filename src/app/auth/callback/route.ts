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

  // Extract platform hint from next param (e.g. /cs/accounts?platform=instagram)
  let requestedPlatform: "instagram" | null = null;
  try {
    const decodedNext = decodeURIComponent(nextParam);
    const urlParts = decodedNext.split("?");
    if (urlParts.length > 1) {
      const params = new URLSearchParams(urlParts[1]);
      const platformParam = params.get("platform");
      if (platformParam === "instagram") {
        requestedPlatform = "instagram";
      }
    }
  } catch {
    // ignore parsing errors
  }

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

  const { data: existingAuthData } = await supabase.auth.getUser();
  const existingUser = existingAuthData.user;
  const { data: existingSessionData } = await supabase.auth.getSession();
  const existingSession = existingSessionData.session;
  const hadExistingSession = Boolean(existingSession?.user?.id);

  const { data: authData, error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    const errorRedirectUrl = existingUser
      ? new URL(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(authError.message)}`, request.url)
      : new URL(`/${locale}/login?error=${encodeURIComponent(authError.message)}`, request.url);
    const errorResponse = NextResponse.redirect(errorRedirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie);
    });
    return errorResponse;
  }

  const oauthSession = authData?.session;
  const oauthUser = oauthSession?.user;
  const targetUserId =
    existingSession?.user?.id ?? existingUser?.id ?? oauthUser?.id ?? null;

  if (oauthSession?.provider_token && targetUserId) {
    const facebookUserToken = oauthSession.provider_token;

    const rowsToUpsert: Array<{
      user_id: string;
      platform: "facebook" | "instagram";
      account_name: string;
      access_token: string;
      platform_id: string | null;
      avatar_url?: string | null;
      is_active: boolean;
    }> = [];

    // Instagram Direct Login – get user's own Instagram account via /me
    if (requestedPlatform === "instagram") {
      try {
        console.log("[Postio] Instagram Direct Login – hledám vlastní IG účet uživatele");

        const meData = await graphFetch<{
          id?: string;
          username?: string;
          name?: string;
          profile_picture_url?: string;
          account_type?: string;
        }>(
          "/me",
          facebookUserToken,
          { fields: "id,username,name,profile_picture_url,account_type" }
        );

        // Try to get Instagram user ID via /me?fields=instagram_business_account
        const igMeData = await graphFetch<{
          instagram_business_account?: { id: string };
        }>(
          "/me",
          facebookUserToken,
          { fields: "instagram_business_account" }
        ).catch(() => null);

        let igUserId: string | null = null;
        let igUsername: string | null = null;
        let igName: string | null = null;
        let igAvatarUrl: string | null = null;

        // If /me returned an Instagram business account context (user is an IG business account)
        if (igMeData?.instagram_business_account?.id) {
          igUserId = igMeData.instagram_business_account.id;
          console.log(`[Postio] IG Business Account nalezen přes /me: ${igUserId}`);
        }

        // Fallback: use the Facebook user ID as IG user ID (works for Instagram Login for Business)
        if (!igUserId && meData?.id) {
          // Check if this looks like an IG account by fetching IG-specific fields
          const igDirectData = await graphFetch<InstagramBusinessResponse>(
            `/${meData.id}`,
            facebookUserToken,
            { fields: "id,username,name,profile_picture_url" }
          ).catch(() => null);

          if (igDirectData?.id) {
            igUserId = igDirectData.id;
            igUsername = igDirectData.username ?? null;
            igName = igDirectData.name ?? null;
            igAvatarUrl = igDirectData.profile_picture_url ?? null;
          }
        }

        // Use data from /me as fallback
        if (!igUserId && meData?.id) {
          igUserId = meData.id;
          igUsername = meData.username ?? null;
          igName = meData.name ?? null;
          igAvatarUrl = meData.profile_picture_url ?? null;
        }

        if (igUserId) {
          console.log(`[Postio] NALEZEN PŘÍMÝ INSTAGRAM: ${igUsername || igName || igUserId}`);

          rowsToUpsert.push({
            user_id: targetUserId,
            platform: "instagram",
            account_name: igUsername || igName || "Instagram",
            access_token: facebookUserToken,
            platform_id: igUserId,
            avatar_url: igAvatarUrl,
            is_active: true,
          });
        } else {
          console.log("[Postio] Instagram Direct Login: nelze najít IG účet uživatele");
        }
      } catch (e) {
        console.log("[Postio] Chyba Instagram Direct Login:", e);
      }
    }

    // Always also fetch Facebook Pages (for Facebook connections or IG via Page)
    try {
      const pagesFields =
        "id,name,access_token,instagram_business_account,picture{url}";

      const pages = await graphFetch<FacebookPagesResponse>(
        "/me/accounts",
        facebookUserToken,
        { fields: pagesFields }
      );

      for (const page of pages.data ?? []) {
        if (!page.id || !page.access_token) continue;

        const pageName = page.name || "Facebook Page";
        const pageAvatarUrl = page.picture?.data?.url ?? null;
        const pageAccessToken = page.access_token;

        // Skip Facebook pages if user only requested Instagram direct login
        // and we already found a direct IG account
        if (requestedPlatform === "instagram" && rowsToUpsert.some(r => r.platform === "instagram")) {
          // Still check for IG accounts linked to pages, but skip FB pages
          const igId = page.instagram_business_account?.id;
          if (!igId) continue;

          console.log(`[Postio] Hledám Instagram pro stránku: ${pageName}`);

          let ig: InstagramBusinessResponse | null = null;
          try {
            ig = await graphFetch<InstagramBusinessResponse>(
              `/${igId}`,
              pageAccessToken,
              { fields: "id,username,name,profile_picture_url" }
            );
          } catch (e) {
            console.log(`[Postio] Chyba při dotazu na IG pro stránku ${pageName}:`, e);
            ig = null;
          }

          if (ig && ig.id) {
            // Only add if not already added via direct login
            if (!rowsToUpsert.some(r => r.platform === "instagram" && r.platform_id === ig.id)) {
              console.log(`[Postio] NALEZEN REÁLNÝ INSTAGRAM: ${ig.username || ig.name || ig.id}`);

              const igNamePage = ig.username || ig.name || pageName || "Instagram";
              const igAvatarUrlPage = ig.profile_picture_url ?? pageAvatarUrl ?? null;

              rowsToUpsert.push({
                user_id: targetUserId,
                platform: "instagram",
                account_name: igNamePage,
                access_token: pageAccessToken,
                platform_id: ig.id,
                avatar_url: igAvatarUrlPage,
                is_active: true,
              });
            }
          }
          continue;
        }

        rowsToUpsert.push({
          user_id: targetUserId,
          platform: "facebook",
          account_name: pageName,
          access_token: pageAccessToken,
          platform_id: page.id,
          avatar_url: pageAvatarUrl,
          is_active: true,
        });

        const igId = page.instagram_business_account?.id;
        if (!igId) continue;

        console.log(`[Postio] Hledám Instagram pro stránku: ${pageName}`);

        let ig: InstagramBusinessResponse | null = null;
        try {
          ig = await graphFetch<InstagramBusinessResponse>(
            `/${igId}`,
            pageAccessToken,
            { fields: "id,username,name,profile_picture_url" }
          );
        } catch (e) {
          console.log(`[Postio] Chyba při dotazu na IG pro stránku ${pageName}:`, e);
          ig = null;
        }

        if (ig && ig.id) {
          console.log(`[Postio] NALEZEN REÁLNÝ INSTAGRAM: ${ig.username || ig.name || ig.id}`);

          const igName = ig.username || ig.name || pageName || "Instagram";
          const igAvatarUrl = ig.profile_picture_url ?? pageAvatarUrl ?? null;

          rowsToUpsert.push({
            user_id: targetUserId,
            platform: "instagram",
            account_name: igName,
            access_token: pageAccessToken,
            platform_id: ig.id,
            avatar_url: igAvatarUrl,
            is_active: true,
          });
        } else {
          console.log(`[Postio] Instagram pro stránku ${pageName} nebyl nalezen nebo API vrátilo prázdnou odpověď.`);
        }
      }
    } catch (e) {
      console.log("[Postio] Chyba při načítání FB Pages:", e);
    }

    if (rowsToUpsert.length > 0) {
      console.log(`[Postio] Ukládám ${rowsToUpsert.length} účtů do social_accounts:`, rowsToUpsert.map(r => `${r.platform}:${r.account_name}(${r.platform_id})`));
      const supabaseAdmin = createAdminClient();
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from("social_accounts")
        .upsert(rowsToUpsert, {
          onConflict: "user_id,platform,platform_id",
        })
        .select();
      if (upsertError) {
        console.log("[Postio] CHYBA UPERTU social_accounts:", upsertError);
      } else {
        console.log("[Postio] Úspěšně uloženo/aktualizováno účtů:", Array.isArray(upsertData) ? upsertData.length : 1);
      }
    }
  }

  let finalNext = next;
  if (hadExistingSession && existingSession) {
    await supabase.auth.setSession({
      access_token: existingSession.access_token,
      refresh_token: existingSession.refresh_token,
    });
  } else if (oauthUser) {
    const { data: userData } = await supabase
      .from("users")
      .select("two_factor_enabled")
      .eq("id", oauthUser.id)
      .single();

    if (!existingUser && userData?.two_factor_enabled) {
      finalNext = `/${locale}/login/verify-2fa`;
    }
  }

  const redirectResponse = NextResponse.redirect(new URL(finalNext, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
