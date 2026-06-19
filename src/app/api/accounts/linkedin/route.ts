import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

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
  const redirectOnSuccess = decodeURIComponent(state ?? `/${locale}/accounts`);
  const redirectOnError = `/${locale}/accounts?error=${encodeURIComponent("LinkedIn connection failed")}`;

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
    redirectUrl.searchParams.set(
      "scope",
      "w_member_social openid profile email"
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
      expires_in?: number;
      id_token?: string;
    };

    const accessToken = tokenData.access_token;
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
