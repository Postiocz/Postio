import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_REDIRECT_URI = "https://postio-alpha.vercel.app/api/accounts/tiktok";
const TIKTOK_OAUTH_SCOPES = ["user.info.basic", "video.upload", "video.publish"] as const;
const SUPPORTED_LOCALES = ["cs", "en", "uk"] as const;

function appendSuccessParam(target: string, key: string, value: string): string {
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}${key}=${value}`;
}

function getLocaleFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = path.match(/^\/(cs|en|uk)(?:\/|$)/);
  const locale = match?.[1];
  return locale && SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])
    ? locale
    : null;
}

function normalizeRedirectPath(path: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/accounts`;
  if (!path) return fallback;

  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    decodedPath = path;
  }

  if (!decodedPath.startsWith("/")) {
    return fallback;
  }

  if (decodedPath.startsWith("//")) {
    return fallback;
  }

  if (decodedPath.startsWith("/api/")) {
    return fallback;
  }

  return decodedPath;
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedRedirect = url.searchParams.get("state");
  const returnedState = url.searchParams.get("state");
  const cookieRedirect = request.cookies.get("tiktok_oauth_redirect")?.value;
  const locale =
    getLocaleFromPath(code ? cookieRedirect : requestedRedirect) ??
    (url.searchParams.get("locale") ?? "cs");
  const baseRedirect = normalizeRedirectPath(
    code ? cookieRedirect : requestedRedirect,
    locale,
  );
  const redirectOnSuccess = appendSuccessParam(baseRedirect, "tiktok", "connected");
  const errorRedirect = (msg: string) => `/${locale}/accounts?error=${encodeURIComponent(msg)}`;
  const redirectOnError = errorRedirect("TikTok connection failed");

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    console.error("[TikTok OAuth] Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET");
    const errorMsg = "TikTok API není nakonfigurováno. Chybí TIKTOK_CLIENT_KEY nebo TIKTOK_CLIENT_SECRET.";
    return NextResponse.redirect(new URL(errorRedirect(errorMsg), request.url));
  }

  // ── Step 1: No code → redirect to TikTok authorize ──────────────
  if (!code) {
    const generatedState = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    const redirectUrl = new URL(TIKTOK_AUTH_URL);
    redirectUrl.searchParams.set("client_key", clientKey);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("scope", TIKTOK_OAUTH_SCOPES.join(","));
    redirectUrl.searchParams.set("redirect_uri", TIKTOK_REDIRECT_URI);
    redirectUrl.searchParams.set("state", generatedState);
    redirectUrl.searchParams.set("code_challenge", codeChallenge);
    redirectUrl.searchParams.set("code_challenge_method", "S256");

    console.log("[TikTok OAuth] Redirect URL:", redirectUrl.toString());
    
    const response = NextResponse.redirect(redirectUrl.toString());
    
    // Set cookies for state and codeVerifier with secure and sameSite: 'none'
    response.cookies.set("tiktok_oauth_state", generatedState, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 600, // 10 minutes
    });
    
    response.cookies.set("tiktok_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("tiktok_oauth_redirect", baseRedirect, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 600, // 10 minutes
    });
    
    return response;
  }

  // ── Step 2: Exchange code for access token ────────────────────────
  try {
    // Verify state for CSRF protection
    const storedState = request.cookies.get("tiktok_oauth_state")?.value;
    const storedCodeVerifier = request.cookies.get("tiktok_code_verifier")?.value;
    
    if (!storedState || !returnedState || storedState !== returnedState) {
      console.error("[TikTok OAuth] State mismatch or missing");
      return NextResponse.redirect(new URL(errorRedirect("Neplatný stav OAuth požadavku"), request.url));
    }
    
    if (!storedCodeVerifier) {
      console.error("[TikTok OAuth] Missing code verifier");
      return NextResponse.redirect(new URL(errorRedirect("Chybí ověřovací kód"), request.url));
    }
    
    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: TIKTOK_REDIRECT_URI,
        code_verifier: storedCodeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      console.error(`[TikTok OAuth] Token exchange failed: ${tokenRes.status} ${text}`);
      const errorMsg = `Výměna autorizačního kódu selhala: ${tokenRes.status} ${text || "Neznámá chyba"}`;
      return NextResponse.redirect(new URL(errorRedirect(errorMsg), request.url));
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      open_id?: string;
    };

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    const openId = tokenData.open_id;

    if (!accessToken) {
      console.error("[TikTok OAuth] No access_token in response");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    // ── Step 3: Fetch user profile via /user/info ───────────
    const userInfoUrl = new URL(TIKTOK_USERINFO_URL);
    userInfoUrl.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");
    
    const userInfoRes = await fetch(userInfoUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!userInfoRes.ok) {
      const text = await userInfoRes.text().catch(() => "");
      console.error(`[TikTok OAuth] /user/info failed: ${userInfoRes.status} ${text}`);
      const errorMsg = `Načítání uživatelských dat selhalo: ${userInfoRes.status} ${text || "Neznámá chyba"}`;
      return NextResponse.redirect(new URL(errorRedirect(errorMsg), request.url));
    }

    const userInfoPayload = await userInfoRes.json() as {
      data?: {
        user?: {
          open_id: string;
          union_id?: string;
          avatar_url?: string;
          display_name?: string;
        }
      };
      error?: {
        message?: string;
      };
    };

    if (userInfoPayload.error?.message || !userInfoPayload.data?.user) {
      console.error(`[TikTok OAuth] /user/info returned error: ${userInfoPayload.error?.message}`);
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userProfile = userInfoPayload.data.user;

    // ── Step 4: Authenticate user in Supabase ────────────────────────
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.error("[TikTok OAuth] User not authenticated");
      return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    const userId = authData.user.id;

    // ── Step 5: Save to social_accounts ──────────────────────────────
    const accountName = userProfile.display_name ?? "TikTok Account";
    const avatarUrl = userProfile.avatar_url ?? null;
    const platformId = userProfile.open_id ?? openId;

    if (!platformId) {
       console.error("[TikTok OAuth] No open_id found for user");
       return NextResponse.redirect(new URL(redirectOnError, request.url));
    }

    // TikTok commonly returns a short-lived access token (often 24h / 86400 s,
    // including Sandbox). That "expires in 1 day" warning is therefore expected
    // as long as we treat `expires_in` as a duration in seconds from "now".
    const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 86400;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from("social_accounts")
      .upsert(
        {
          user_id: userId,
          platform: "tiktok",
          account_name: accountName,
          access_token: accessToken,
          platform_id: platformId,
          avatar_url: avatarUrl,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          metadata: {
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
            open_id: openId,
            union_id: userProfile.union_id,
          },
        },
        {
          onConflict: "user_id,platform,platform_id",
        }
      );

    if (dbError) {
      console.error("[TikTok OAuth] DB upsert error:", dbError);
      const errorMsg = `Uložení účtu do databáze selhalo: ${dbError.message || "Neznámá chyba"}`;
      return NextResponse.redirect(new URL(errorRedirect(errorMsg), request.url));
    }

    console.log(`[TikTok OAuth] Successfully connected ${accountName} (${platformId}) for user ${userId}`);

    // ── Step 6: Redirect back to dashboard ───────────────────────────
    const response = NextResponse.redirect(new URL(redirectOnSuccess, request.url));
    
    // Clear OAuth cookies after successful authentication
    response.cookies.delete("tiktok_oauth_state");
    response.cookies.delete("tiktok_code_verifier");
    response.cookies.delete("tiktok_oauth_redirect");
    
    return response;
  } catch (error) {
    console.error("[TikTok OAuth] Unexpected error:", error);
    return NextResponse.redirect(new URL(redirectOnError, request.url));
  }
}
