import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type FacebookPagesResponse = {
  data?: Array<{
    id: string;
    name?: string;
    access_token?: string;
    category?: string;
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

type SocialAccountMetadata = {
  // Page-level access token returned by Meta for the Facebook Page.
  // Stored in metadata (in addition to the main `access_token` column) so the
  // UI can later swap it without rewriting the main column, and so that
  // future per-platform extras (e.g. X bearer, TikTok open_id) can live
  // alongside it in a single JSON blob.
  access_token?: string;
  // Page category as returned by Graph API (e.g. "Local Business",
  // "Product/Service", "Entertainment"). Used in the UI to help the user
  // disambiguate Pages that share a similar name. May be `null` if Meta
  // did not return the field for this Page.
  category?: string | null;
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

// ============================================================
// YouTube (Google OAuth) – Connect a YouTube channel
// ============================================================
// Triggered from `/api/auth/google?state=<redirect>` which forwards the
// `code` here with `?provider=youtube` so we can branch BEFORE the regular
// Supabase Auth `exchangeCodeForSession` (otherwise Supabase would try to
// sign the user in with Google and ignore the YouTube scopes).
type YouTubeChannelSnippet = {
  title?: string;
  description?: string;
  customUrl?: string;
  thumbnails?: {
    default?: { url?: string };
    medium?: { url?: string };
    high?: { url?: string };
  };
};

type YouTubeChannelsResponse = {
  items?: Array<{ id: string; snippet?: YouTubeChannelSnippet }>;
};

async function handleYouTubeCallback(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "/accounts";

  // 🔍 DEBUG: Začínám zpracování YouTube callbacku
  console.log("🔍 DEBUG: Začínám zpracování YouTube callbacku");

  // 🔍 DEBUG: Query parametry – všechny co Google poslal zpět
  const allParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });
  console.log("🔍 DEBUG: Query parametry:", allParams);

  // Derive locale from the `state` redirect path (set by /api/auth/google).
  // Fallback chain matches the rest of the file: referer → "cs".
  const localeFromState = state.match(/^\/(cs|en|uk)(?:\/|$)/)?.[1];
  const localeFromReferer = request.headers
    .get("referer")
    ?.match(/\/(cs|en|uk)(?:\/|$)/)?.[1];
  const locale = localeFromState ?? localeFromReferer ?? "cs";

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/accounts?error=${encodeURIComponent(msg)}`, request.url)
    );

  if (!code) {
    return errorRedirect("Missing OAuth code from Google");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[YouTube OAuth] Missing GOOGLE_CLIENT_ID/SECRET in env");
    return errorRedirect("Google OAuth not configured");
  }

  // ── Step 1: Authenticated Postio user is required ───────────────
  // The user MUST be signed in to Postio before connecting YouTube.
  // We do not use `supabase.auth.exchangeCodeForSession` because that
  // would sign the user in as the Google identity and ignore the
  // YouTube scope – this flow is purely a social-account connection.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        `/${locale}/login?error=${encodeURIComponent("Pro připojení YouTube se musíte přihlásit")}`,
        request.url
      )
    );
  }

  // ── Step 2: Exchange authorization code for tokens ──────────────
  // The redirect_uri MUST match exactly the value we sent to Google
  // in `/api/auth/google` (including the `provider=youtube` query).
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/auth/callback?provider=youtube`,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    console.error(`[YouTube OAuth] Token exchange failed: ${tokenRes.status} ${text}`);
    return errorRedirect("Token exchange with Google failed");
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
  };

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;

  // 🔍 DEBUG: Access Token získán
  console.log("🔍 DEBUG: Access Token získán:", accessToken ? "ano" : "ne");
  console.log("🔍 DEBUG: Refresh Token získán:", refreshToken ? "ano" : "ne");
  console.log("🔍 DEBUG: Expires in (s):", expiresIn ?? "neuvedeno");
  console.log("🔍 DEBUG: Scope:", tokenData.scope ?? "neuvedeno");

  if (!accessToken) {
    console.error("[YouTube OAuth] No access_token in response");
    return errorRedirect("Google did not return an access token");
  }

  // ── Step 3: Fetch the YouTube channel ───────────────────────────
  // `mine=true` returns the channel owned by the authenticated user.
  // We need the channel ID (`id`) to use as `platform_id` so we can
  // later address this channel when publishing videos.
  const channelsRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=1",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!channelsRes.ok) {
    const text = await channelsRes.text().catch(() => "");
    console.error(`[YouTube OAuth] channels.list failed: ${channelsRes.status} ${text}`);
    return errorRedirect("Failed to load YouTube channel");
  }

  const channels = (await channelsRes.json()) as YouTubeChannelsResponse;

  // 🔍 DEBUG: Kompletní odpověď z YouTube API (channels list)
  console.log(
    "🔍 DEBUG: Odpověď z YouTube API (channels list):",
    JSON.stringify(channels, null, 2)
  );

  const channel = channels.items?.[0];

  if (!channel?.id) {
    // ⚠️ CHYBA: Google nevrátil žádný YouTube kanál pro tento účet
    console.error(
      "⚠️ CHYBA: Google nevrátil žádný YouTube kanál pro tento účet."
    );
    console.error(
      "⚠️ CHYBA: Počet položek v items:",
      channels.items?.length ?? 0
    );
    console.error(
      "⚠️ CHYBA: Pravděpodobné příčiny: (1) Google účet nemá vytvořený YouTube kanál, (2) scope youtube.upload nestačí na channels.list – zkuste přidat https://www.googleapis.com/auth/youtube.readonly nebo https://www.googleapis.com/auth/youtube.force-ssl"
    );
    return errorRedirect(
      "Google nevrátil žádný YouTube kanál pro tento účet (no_youtube_channel)"
    );
  }

  const channelId = channel.id;
  const channelTitle = channel.snippet?.title ?? "YouTube Channel";
  const customUrl = channel.snippet?.customUrl ?? null;
  const channelAvatar =
    channel.snippet?.thumbnails?.high?.url ??
    channel.snippet?.thumbnails?.medium?.url ??
    channel.snippet?.thumbnails?.default?.url ??
    null;

  // Google access tokens expire after 1 hour, so the `token_expires_at`
  // is always short-lived. The refresh token (if present) is what we
  // rely on for long-term access; we store it in `metadata` so we do
  // not need a new DB column.
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  // ── Step 4: Persist the channel in social_accounts ─────────────
  // Uses the admin client so the upsert is not blocked by RLS – this
  // matches the pattern used by the LinkedIn and Facebook flows.
  const supabaseAdmin = createAdminClient();
  const { error: dbError } = await supabaseAdmin
    .from("social_accounts")
    .upsert(
      {
        user_id: user.id,
        platform: "youtube",
        account_name: channelTitle,
        access_token: accessToken,
        platform_id: channelId,
        avatar_url: channelAvatar,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        metadata: {
          // Google only returns `refresh_token` on the first exchange
          // (or when `prompt=consent` is sent). When the user re-connects
          // and no new refresh_token comes back, we keep the previously
          // stored one – this is standard Google OAuth behavior and we
          // do not want to overwrite a still-valid token with undefined.
          ...(refreshToken ? { refresh_token: refreshToken } : {}),
          custom_url: customUrl,
        },
      },
      {
        onConflict: "user_id,platform,platform_id",
      }
    );

  if (dbError) {
    // ⚠️ CHYBA: Detailní výpis Postgres chyby pro diagnostiku
    console.error("⚠️ CHYBA: Supabase DB upsert selhal");
    console.error("⚠️ CHYBA: dbError.message:", dbError.message);
    console.error("⚠️ CHYBA: dbError.code:", dbError.code);
    console.error("⚠️ CHYBA: dbError.details:", dbError.details);
    console.error("⚠️ CHYBA: dbError.hint:", dbError.hint);
    console.error("⚠️ CHYBA: kompletní objekt:", JSON.stringify(dbError, null, 2));
    return errorRedirect(
      `Failed to save YouTube account: ${dbError.message} (db_error)`
    );
  }

  console.log(
    `[YouTube OAuth] Connected channel "${channelTitle}" (${channelId}) for user ${user.id}`
  );

  // ── Step 5: Redirect back to /accounts ─────────────────────────
  return NextResponse.redirect(
    new URL(`/${locale}/accounts?yt=connected`, request.url)
  );
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // YouTube connection flow MUST be handled BEFORE the Supabase Auth
  // exchange, otherwise Supabase would try to sign the user in via
  // Google and discard the YouTube-specific scope.
  if (requestUrl.searchParams.get("provider") === "youtube") {
    return handleYouTubeCallback(request);
  }

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
      // `metadata` is NOT NULL in the DB schema (DEFAULT '{}'::jsonb), so we
      // require every row to set it explicitly – even an empty object is
      // fine. Keeping it required in the type prevents accidental nullish
      // values from slipping into the upsert payload.
      metadata: SocialAccountMetadata;
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
            metadata: {},
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
        "id,name,access_token,category,instagram_business_account,picture{url}";

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
                metadata: {},
              });
            }
          }
          continue;
        }

        // Facebook Pages are NEVER auto-activated. After OAuth we store every
        // Page the user owns as `is_active = false` and put the Page-level
        // access_token + category into `metadata`. The user then picks which
        // Pages to enable in the UI (next feature step).
        rowsToUpsert.push({
          user_id: targetUserId,
          platform: "facebook",
          account_name: pageName,
          access_token: pageAccessToken,
          platform_id: page.id,
          avatar_url: pageAvatarUrl,
          is_active: false,
          metadata: {
            access_token: pageAccessToken,
            category: page.category ?? null,
          },
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
            metadata: {},
          });
        } else {
          console.log(`[Postio] Instagram pro stránku ${pageName} nebyl nalezen nebo API vrátilo prázdnou odpověď.`);
        }
      }
    } catch (e) {
      console.log("[Postio] Chyba při načítání FB Pages:", e);
    }

    // Before upserting the freshly fetched set of Pages, make sure that
    // NO Facebook Page of this user is left in the `is_active = true` state.
    // This is critical because:
    //   1. We always upsert with `is_active = false` (user must opt in).
    //   2. If the user previously connected a Page that has since been
    //      removed from their Meta account, the upsert will NOT touch it
    //      (it is no longer in `pages.data`), but it would otherwise remain
    //      active in our DB. We therefore explicitly deactivate every
    //      Facebook row, then re-upsert the current set (still inactive).
    try {
      const supabaseAdmin = createAdminClient();
      const { error: deactivateError } = await supabaseAdmin
        .from("social_accounts")
        .update({ is_active: false })
        .eq("user_id", targetUserId)
        .eq("platform", "facebook");

      if (deactivateError) {
        console.log(
          "[Postio] CHYBA při deaktivaci starých FB účtů:",
          deactivateError
        );
      }
    } catch (e) {
      console.log("[Postio] Neočekávaná chyba při deaktivaci starých FB účtů:", e);
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

  // After a Facebook Pages OAuth flow, signal the /accounts page with
  // `?fb=connected` so it auto-opens the new "pick which Pages to enable"
  // dialog. We only do this for the Pages flow – the Instagram direct
  // login does not need this hint (Instagram accounts are auto-activated).
  if (requestedPlatform !== "instagram") {
    const separator = finalNext.includes("?") ? "&" : "?";
    finalNext = `${finalNext}${separator}fb=connected`;
  }

  const redirectResponse = NextResponse.redirect(new URL(finalNext, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
