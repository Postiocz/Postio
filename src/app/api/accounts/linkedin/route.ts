import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

/**
 * Appends `?<key>=<value>` (or `&<key>=<value>` when the URL already has a
 * query string) to `target`. Used to attach the OAuth success signal
 * (e.g. `?li=connected`) to the post-auth redirect path coming from the
 * `state` query param. Path-only inputs (no host) are supported – we
 * intentionally keep it that way so callers can pass through arbitrary
 * localized paths like `/cs/accounts` without breaking.
 */
function appendSuccessParam(target: string, key: string, value: string): string {
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}${key}=${value}`;
}

/**
 * GET /api/accounts/linkedin
 *
 * Two modes:
 * 1. No `code` param → redirect user to LinkedIn OAuth consent screen
 * 2. `code` param present → exchange code for token, fetch user info, save account
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // redirect path after success
  const locale = url.searchParams.get("locale") ?? "cs";
  // `redirectOnSuccess` is built with `?li=connected` appended to whatever
  // path the caller passed via `state` (typically `/{locale}/accounts`).
  // The accounts page watches for that query param and shows a success
  // toast + refreshes the connected-accounts list. Mirrors the YouTube
  // flow which uses `?yt=connected`.
  const baseRedirect = decodeURIComponent(state ?? `/${locale}/accounts`);
  const redirectOnSuccess = appendSuccessParam(baseRedirect, "li", "connected");
  const errorRedirect = (msg: string) =>
    `/${locale}/accounts?error=${encodeURIComponent(msg)}`;
  const redirectOnError = errorRedirect("LinkedIn connection failed");

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[LinkedIn OAuth] Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET");
    return NextResponse.redirect(
      new URL(redirectOnError, request.url)
    );
  }

  // ── Step 1: No code → redirect to LinkedIn authorize ──────────────
  if (!code) {
    const redirectUrl = new URL(LINKEDIN_AUTH_URL);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("client_id", clientId);
    redirectUrl.searchParams.set(
      "redirect_uri",
      `${url.origin}/api/accounts/linkedin`
    );
    // NOTE: `r_member_social` (read member social) is intentionally NOT
    // requested – the LinkedIn developer app does not have that product
    // approved, so LinkedIn rejects the whole authorization request with
    // `unauthorized_scope_error`. Publishing only needs `w_member_social`
    // (write/post). Keep this lean – add scopes only when a real feature
    // needs them, otherwise OAuth fails before the user even consents.
    redirectUrl.searchParams.set(
      "scope",
      "openid profile email w_member_social"
    );
    redirectUrl.searchParams.set("state", state ?? "");

    return NextResponse.redirect(redirectUrl.toString());
  }

  // ── Step 2: Exchange code for access token ────────────────────────
  try {
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/api/accounts/linkedin`,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      console.error(`[LinkedIn OAuth] Token exchange failed: ${tokenRes.status} ${text}`);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      // LinkedIn returns a long-lived `refresh_token` (separate from the
      // 60-day access token) alongside every authorization-code exchange.
      // We MUST persist it so the publisher can mint a fresh access token
      // when the original one expires (see publish-linkedin.ts → refresh).
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
    };

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    if (!accessToken) {
      console.error("[LinkedIn OAuth] No access_token in response");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    // ── Step 3: Fetch user profile via /userinfo (OpenID) ───────────
    const userInfoRes = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!userInfoRes.ok) {
      const text = await userInfoRes.text().catch(() => "");
      console.error(`[LinkedIn OAuth] /userinfo failed: ${userInfoRes.status} ${text}`);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userInfo = (await userInfoRes.json()) as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email?: string;
    };

    // ── Step 4: Authenticate user in Supabase ────────────────────────
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.error("[LinkedIn OAuth] User not authenticated");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userId = authData.user.id;

    // ── Step 5: Save to social_accounts ──────────────────────────────
    const accountName =
      userInfo.name ?? `${userInfo.given_name ?? ""} ${userInfo.family_name ?? ""}`.trim() ?? "LinkedIn Account";
    const avatarUrl = userInfo.picture ?? null;
    const platformId = userInfo.sub; // LinkedIn OpenID subject (unique user ID)

    // LinkedIn tokens expire in 60 days
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from("social_accounts")
      .upsert(
        {
          user_id: userId,
          platform: "linkedin",
          account_name: accountName,
          access_token: accessToken,
          platform_id: platformId,
          avatar_url: avatarUrl,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          // Persist `refresh_token` inside `metadata` (JSONB blob) – the
          // table itself does not have a dedicated `refresh_token`
          // column. LinkedIn returns the refresh token on the
          // authorization-code exchange; subsequent refresh exchanges do
          // NOT return a new one, so when the user reconnects and we get
          // no fresh value we deliberately KEEP the previously stored one
          // (mirrors the YouTube pattern in `src/app/api/auth/google/route.ts`).
          metadata: {
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
          },
        },
        {
          onConflict: "user_id,platform,platform_id",
        }
      );

    if (dbError) {
      console.error("[LinkedIn OAuth] DB upsert error:", dbError);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    console.log(`[LinkedIn OAuth] Successfully connected ${accountName} (${platformId}) for user ${userId}`);

    // ── Step 6: Redirect back to dashboard ───────────────────────────
    return NextResponse.redirect(new URL(redirectOnSuccess, request.url));
  } catch (error) {
    console.error("[LinkedIn OAuth] Unexpected error:", error);
    return NextResponse.redirect(new URL(redirectOnError, request.url));
  }
}
