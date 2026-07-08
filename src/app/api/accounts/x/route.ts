import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isNewAccountAllowed, accountLimitErrorMessage } from "@/lib/account-limit";

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USER_URL = "https://api.twitter.com/2/users/me";

/**
 * Appends `?<key>=<value>` (or `&<key>=<value>` when the URL already has a
 * query string) to `target`. Used to attach the OAuth success signal
 * (e.g. `?x=connected`) to the post-auth redirect path coming from the
 * `state` query param.
 */
function appendSuccessParam(target: string, key: string, value: string): string {
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}${key}=${value}`;
}

/**
 * Generate a random PKCE code verifier (43-128 chars).
 * X (Twitter) OAuth 2.0 requires PKCE for public clients.
 */
function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 128);
}

/**
 * SHA-256 hash the code verifier to produce the code challenge.
 * X requires S256 challenge method.
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * GET /api/accounts/x
 *
 * Two modes:
 * 1. No `code` param → redirect user to X OAuth 2.0 consent screen (with PKCE)
 * 2. `code` param present → exchange code for token (PKCE), fetch user info, save account
 *
 * Scopes: tweet.read, tweet.write, users.read, offline.access
 * - tweet.read: read tweets (for sync/verify)
 * - tweet.write: publish and delete tweets
 * - users.read: get user profile info
 * - offline.access: refresh token support (long-lived access)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state"); // redirect path after success (from Twitter)
  const locale = url.searchParams.get("locale") ?? "cs";

  const baseRedirect = decodeURIComponent(stateParam ?? `/${locale}/accounts`);
  const redirectOnSuccess = appendSuccessParam(baseRedirect, "x", "connected");
  const redirectOnError = `/${locale}/accounts?error=${encodeURIComponent("X connection failed")}`;

  const clientId = process.env.TWITTER_CLIENT_ID ?? process.env.X_API_KEY;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? process.env.X_API_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[X OAuth] Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET in env");
    return NextResponse.redirect(new URL(redirectOnError, request.url));
  }

  // Stable redirect_uri – used in both authorize and token-exchange steps
  const redirectUri = `${url.origin}/api/accounts/x`;

  // ── Step 1: No code → generate PKCE, store in cookies, redirect ──
  if (!code) {
    // Server-side PKCE: generate verifier → derive challenge (S256)
    // The verifier is stored in an httpOnly cookie so Twitter cannot
    // intercept it. The challenge goes to Twitter's authorize URL.
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    const redirectUrl = new URL(X_AUTH_URL);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("client_id", clientId);
    redirectUrl.searchParams.set("redirect_uri", redirectUri);
    redirectUrl.searchParams.set(
      "scope",
      "tweet.read tweet.write users.read offline.access"
    );
    redirectUrl.searchParams.set("state", stateParam ?? "");
    redirectUrl.searchParams.set("code_challenge", challenge);
    redirectUrl.searchParams.set("code_challenge_method", "S256");
    redirectUrl.searchParams.set("access_type", "offline");

    console.log("[X OAuth] Redirecting to X authorize", {
      redirect_uri: redirectUri,
      state: stateParam,
      authorize_url: redirectUrl.toString(),
    });

    // Store PKCE verifier and state in httpOnly cookies.
    // Twitter only returns `code` and `state` on callback – it does NOT
    // forward custom query params (code_verifier) back to our redirect_uri.
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.set("x_code_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/accounts/x",
      maxAge: 60 * 10, // 10 minutes – enough for the OAuth flow
    });
    if (stateParam) {
      response.cookies.set("x_oauth_state", stateParam, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/accounts/x",
        maxAge: 60 * 10,
      });
    }
    return response;
  }

  // ── Step 2: Callback – read verifier from cookie, exchange code ──
  try {
    // Read PKCE values from cookies (Twitter only returns `code` and `state`)
    const cookies = request.cookies;
    const codeVerifier = cookies.get("x_code_verifier")?.value;
    const state = cookies.get("x_oauth_state")?.value;

    if (!codeVerifier) {
      console.error("[X OAuth] Missing x_code_verifier cookie – PKCE flow broken");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    // Basic auth header: base64(client_id:client_secret)
    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // Debug logging – log token exchange request
    console.log("[X OAuth] Token exchange request", {
      code: code?.slice(0, 10) + "...",
      has_code_verifier: !!codeVerifier,
      code_verifier_length: codeVerifier?.length ?? 0,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: tokenBody,
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      console.error(`[X OAuth] Token exchange failed: ${tokenRes.status} ${text}`);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
      refresh_token?: string;
    };

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      console.error("[X OAuth] No access_token in response");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    console.log("[X OAuth] Token received", {
      tokenType: tokenData.token_type,
      expiresIn,
      scope: tokenData.scope,
      hasRefreshToken: !!refreshToken,
    });

    // ── Step 3: Fetch user profile via /2/users/me ─────────────────
    const userRes = await fetch(X_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!userRes.ok) {
      const text = await userRes.text().catch(() => "");
      console.error(`[X OAuth] /2/users/me failed: ${userRes.status} ${text}`);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userData = (await userRes.json()) as {
      data?: {
        id: string;
        username?: string;
        name?: string;
        profile_image_url?: string;
        description?: string;
        verified?: boolean;
      };
    };

    if (!userData?.data?.id) {
      console.error("[X OAuth] No user data in response");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const {
      id: platformId,
      username,
      name: accountName,
      profile_image_url: avatarUrl,
    } = userData.data;

    // ── Step 4: Authenticate user in Supabase ──────────────────────
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.error("[X OAuth] User not authenticated");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userId = authData.user.id;

    // ── Step 5: Calculate token expiry ─────────────────────────────
    // X access tokens with offline.access scope are long-lived.
    // If expires_in is provided, use it. Otherwise default to 2 hours
    // (standard Bearer token lifetime without refresh).
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    // ── Step 6: Save to social_accounts ────────────────────────────
    // Enforce the plan account limit before upserting. A reconnect of the
    // same X account (same platform_id) is always allowed; a brand-new
    // connection is blocked once the user is at their plan's limit.
    const { allowed: xAllowed, info: xInfo } = await isNewAccountAllowed(
      supabase,
      userId,
      "twitter",
      platformId,
    );
    if (!xAllowed) {
      console.error("[X OAuth] Account limit reached:", xInfo);
      const limitErrorUrl = new URL(`/${locale}/accounts`, request.url);
      limitErrorUrl.searchParams.set("error", accountLimitErrorMessage(xInfo));
      return NextResponse.redirect(limitErrorUrl);
    }

    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from("social_accounts")
      .upsert(
        {
          user_id: userId,
          platform: "twitter",
          account_name: accountName ?? `@${username ?? platformId}`,
          access_token: accessToken,
          platform_id: platformId,
          avatar_url: avatarUrl ?? null,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          metadata: {
            username: username ?? null,
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
          },
        },
        {
          onConflict: "user_id,platform,platform_id",
        }
      );

    if (dbError) {
      console.error("[X OAuth] DB upsert error:", dbError);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    console.log(
      `[X OAuth] Successfully connected @${username ?? platformId} (${platformId}) for user ${userId}`
    );

    // ── Step 7: Redirect back to dashboard & clear PKCE cookies ────
    const successResponse = NextResponse.redirect(new URL(redirectOnSuccess, request.url));
    // Clear PKCE cookies after successful auth
    successResponse.cookies.set("x_code_verifier", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/accounts/x",
      maxAge: 0, // expire immediately
    });
    successResponse.cookies.set("x_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/accounts/x",
      maxAge: 0,
    });
    return successResponse;
  } catch (error) {
    console.error("[X OAuth] Unexpected error:", error);
    return NextResponse.redirect(new URL(redirectOnError, request.url));
  }
}
