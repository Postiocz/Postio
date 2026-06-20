import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  // `youtube.upload` is required to publish videos on behalf of the user
  // via the YouTube Data API v3 (`videos.insert`) – we will need it later
  // when the YouTube publisher is implemented.
  "https://www.googleapis.com/auth/youtube.upload",
  // `youtube.readonly` is REQUIRED to call `channels.list?mine=true` and
  // resolve the user's channel ID + snippet. `youtube.upload` alone is
  // write-only and returns 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT on any
  // read endpoint. This scope adds read access to channels, playlists
  // and videos without granting any additional write permissions.
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth 2.0 flow used to connect a YouTube channel
 * to the currently logged-in Postio user.
 *
 * Two modes:
 *  1. No `code` query param → redirect the user to the Google consent screen.
 *     We request `access_type=offline` + `prompt=consent` so Google returns
 *     a `refresh_token` on the first exchange (Google access tokens expire
 *     after 1 hour, so the refresh token is required for long-lived access).
 *  2. `code` present → redirect to `/auth/callback?provider=youtube&code=...`
 *     where the callback route performs the token exchange and stores the
 *     channel in `social_accounts`. The actual token exchange is intentionally
 *     NOT done here – it is kept in one place (the callback) for consistency
 *     with the other Postio OAuth flows.
 *
 * Scopes:
 *  - `openid` – required for OpenID Connect ID token.
 *  - `userinfo.profile` – lets us read the user's basic profile (used as a
 *    graceful fallback if the YouTube Data API call ever fails).
 *  - `youtube.upload` – required to publish videos on behalf of the user
 *    via the YouTube Data API v3 (`videos.insert`). Write-only.
 *  - `youtube.readonly` – required to read the user's channel info
 *    (`channels.list?mine=true`) during the OAuth callback. Without this
 *    scope, Google returns 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT because
 *    `youtube.upload` does not grant read access. The minimal scopes we
 *    request are: read channel + write videos.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // post-auth redirect path

  // Locale is derived from the referer (same convention as the other
  // Postio OAuth routes) and falls back to `cs` so the post-auth redirect
  // never lands on a non-localized URL.
  const localeFromReferer = request.headers
    .get("referer")
    ?.match(/\/(cs|en|uk)(?:\/|$)/)?.[1];
  const locale = localeFromReferer ?? "cs";

  const safeState = state && state.startsWith("/") ? state : `/${locale}/accounts`;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in env"
    );
    const errorRedirect = `/${locale}/accounts?error=${encodeURIComponent("Google OAuth not configured")}`;
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }

  // ── Step 1: No code → redirect to Google consent screen ───────────
  if (!code) {
    const redirectUrl = new URL(GOOGLE_AUTH_URL);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("client_id", clientId);
    // The redirect URI must match EXACTLY what is configured in Google Cloud
    // Console → APIs & Services → Credentials → OAuth 2.0 Client IDs.
    // The `provider=youtube` query param is what tells our callback route
    // to treat the response as a YouTube channel connection (and NOT as a
    // Supabase Auth sign-in attempt).
    redirectUrl.searchParams.set(
      "redirect_uri",
      `${url.origin}/auth/callback?provider=youtube`
    );
    redirectUrl.searchParams.set("scope", GOOGLE_SCOPES);
    // `offline` + `consent` are both required: `offline` asks for a
    // refresh_token, and `consent` forces the consent screen so Google
    // actually issues a refresh_token even on subsequent connections.
    redirectUrl.searchParams.set("access_type", "offline");
    redirectUrl.searchParams.set("prompt", "consent");
    redirectUrl.searchParams.set("include_granted_scopes", "true");
    redirectUrl.searchParams.set("state", safeState);

    return NextResponse.redirect(redirectUrl.toString());
  }

  // ── Step 2: Code present → forward to callback for processing ─────
  // The actual token exchange, channel lookup and DB upsert happen in
  // `/auth/callback?provider=youtube` so all Postio OAuth flows share
  // a single entry point.
  const callbackUrl = new URL(`${url.origin}/auth/callback`);
  callbackUrl.searchParams.set("provider", "youtube");
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", safeState);

  return NextResponse.redirect(callbackUrl.toString());
}
