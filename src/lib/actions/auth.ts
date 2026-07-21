"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { applyReferral, REFERRAL_COOKIE } from "@/lib/referral";
import {
  sendTransactionalEmail,
  SENDER_NOREPLY,
} from "@/lib/email";

// Locale messages for e-mail content (loaded directly instead of next-intl/server
// because Server Actions do not share the same async context as components).
import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";

type Locale = "cs" | "en" | "uk";

type EmailAuthState = {
  errorKey: "emailNotVerified" | "invalidCredentials" | "signInError" | "signUpError" | "emailAlreadyExists" | null;
  errorMessage: string | null;
  successKey: "checkEmailToVerify" | null;
};

type ResetPasswordState = {
  errorKey: "resetError" | null;
  errorMessage: string | null;
  successKey: "resetEmailSent" | null;
};

type UpdatePasswordState = {
  errorKey: "passwordsDoNotMatch" | "passwordTooShort" | "passwordUpdateError" | null;
  successKey: "passwordUpdated" | null;
};

function normalizeLocale(value: unknown): Locale {
  const raw = String(value || "cs");
  return raw === "cs" || raw === "en" || raw === "uk" ? raw : "cs";
}

export async function logoutAction(formData: FormData) {
  const client = await createClient();
  await client.auth.signOut();
  const locale = normalizeLocale(formData.get("locale"));
  redirect(`/${locale}/login`);
}

export async function emailAuthAction(
  _prevState: EmailAuthState,
  formData: FormData
): Promise<EmailAuthState> {
  const locale = normalizeLocale(formData.get("locale"));
  const mode = String(formData.get("mode") || "signin");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const baseUrl = await (async () => {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  })();

  if (!email || !password) {
    return { errorKey: "signInError", errorMessage: null, successKey: null };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `new URL(path, base)` normalizes the slash between base and path,
        // so a trailing-slash `NEXT_PUBLIC_APP_URL` can never produce `//auth`.
        emailRedirectTo: new URL("/auth/callback", baseUrl).toString(),
      },
    });

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("already")) {
        return { errorKey: "emailAlreadyExists", errorMessage: null, successKey: null };
      }
      return { errorKey: "signUpError", errorMessage: error.message, successKey: null };
    }

    // Referral attribution (best-effort: never fail sign-up because of it).
    const refCookie = (await cookies()).get(REFERRAL_COOKIE)?.value;
    if (refCookie && data.user) {
      try {
        await applyReferral(refCookie, data.user.id);
      } catch {
        // Ignore – referral capture must not block account creation.
      }
    }

    if (data.user && !data.user.email_confirmed_at) {
      return { errorKey: null, errorMessage: null, successKey: "checkEmailToVerify" };
    }

    return { errorKey: null, errorMessage: null, successKey: "checkEmailToVerify" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("email") && msg.includes("confirm")) {
      return { errorKey: "emailNotVerified", errorMessage: null, successKey: null };
    }
    if (msg.includes("invalid login")) {
      return { errorKey: "invalidCredentials", errorMessage: null, successKey: null };
    }
    return { errorKey: "signInError", errorMessage: error.message, successKey: null };
  }

  if (!data?.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return { errorKey: "emailNotVerified", errorMessage: null, successKey: null };
  }

  try {
    const { data: userData } = await supabase
      .from("users")
      .select("two_factor_enabled")
      .eq("id", data.user.id)
      .single();

    if (userData?.two_factor_enabled) {
      redirect(`/${locale}/login/verify-2fa`);
    }
  } catch {
  }

  redirect(`/${locale}/dashboard`);
}

// ============================================================
// Password reset – Step 1: send the recovery e-mail via Resend
// ============================================================
// Triggered from the "Forgot password?" view in `email-signin.tsx`.
// Instead of relying on Supabase's built-in email, we:
//   1. Generate a recovery link via `supabase.auth.admin.generateLink()`
//      (requires SUPABASE_SERVICE_ROLE_KEY env var).
//   2. Send a branded e-mail ourselves through Resend from noreply@postio-app.cz.
//
// Why this approach: full control over the e-mail content, sender address,
// and deliverability. The admin API lets us get the signed action_link
// without Supabase sending the e-mail on our behalf.
export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const locale = normalizeLocale(formData.get("locale"));
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    return { errorKey: "resetError", errorMessage: null, successKey: null };
  }

  // Build the absolute base URL the same way as `emailAuthAction` so the
  // recovery link points back to this exact deployment (works on localhost
  // and on Vercel preview/production URLs alike).
  const baseUrl = await (async () => {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  })();

  // Build the redirectTo URL that the recovery link will target.
  // The callback route checks `?type=recovery` and forwards to the
  // reset-password page where the user sets a new password.
  const redirectTo = new URL("/auth/callback", baseUrl);
  redirectTo.searchParams.set("type", "recovery");
  redirectTo.searchParams.set(
    "next",
    `/${locale}/login/reset-password`
  );
  const redirectToUrl = redirectTo.toString();

  // Use the admin client (service_role) to generate the recovery link.
  // This produces a signed action_link without Supabase sending any e-mail.
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: redirectToUrl,
    },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[auth] Failed to generate recovery link:", error?.message);
    return { errorKey: "resetError", errorMessage: null, successKey: null };
  }

  const actionLink = data.properties.action_link;

  // Load locale-specific e-mail content matching the user's current UI
  // language. The locale is passed from the form (derived from the URL path
  // in `email-signin.tsx`) – this is the language the user is actively using
  // and therefore the correct one for the e-mail. We intentionally do NOT
  // look up `public.users.language` here because it stores a stored preference
  // that may be outdated, while the form locale reflects the current session.
  const messages = loadLocaleMessages(locale);
  const emailNs = messages.email;
  const pwReset = emailNs.passwordReset;

  const html = buildResetEmailHtml({
    title: pwReset.title,
    body: pwReset.body,
    cta: pwReset.cta,
    ignore: pwReset.ignore,
    actionLink,
    footerTagline: emailNs.footerTagline,
  });

  const text = `${pwReset.title}\n\n${pwReset.body}\n\n${actionLink}\n\n${pwReset.ignore}`;

  const result = await sendTransactionalEmail({
    to: email,
    subject: pwReset.subject,
    html,
    text,
    from: SENDER_NOREPLY,
  });

  if (!result.success) {
    console.error("[auth] Failed to send reset email via Resend:", result.error);
    return { errorKey: "resetError", errorMessage: null, successKey: null };
  }

  return { errorKey: null, errorMessage: null, successKey: "resetEmailSent" };
}

// ============================================================
// Password reset – Step 2: set the new password
// ============================================================
// Called from the `/login/reset-password` page. At this point Supabase has
// already exchanged the recovery code for a session (in the callback route),
// so the user is authenticated and `updateUser` can change their password.
// We return a `successKey` instead of doing a server redirect so the page can
// show the "password updated" confirmation before sending the user to login.
export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 6) {
    return { errorKey: "passwordTooShort", successKey: null };
  }

  if (password !== confirmPassword) {
    return { errorKey: "passwordsDoNotMatch", successKey: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { errorKey: "passwordUpdateError", successKey: null };
  }

  return { errorKey: null, successKey: "passwordUpdated" };
}

// ============================================================
// Helpers for the password-reset e-mail
// ============================================================

/** Load locale messages (cs/en/uk) for the e-mail templating. */
type LocaleMessages = typeof csMessages;

function loadLocaleMessages(locale: string): LocaleMessages {
  switch (locale) {
    case "en":
      return enMessages;
    case "uk":
      return ukMessages;
    default:
      return csMessages;
  }
}

/**
 * Build a branded HTML e-mail for the password-reset flow.
 *
 * Design follows the Postio design system: pure-black background,
 * glassmorphism card, indigo CTA – consistent with the app's login
 * page look so the user immediately recognises the brand.
 */
function buildResetEmailHtml(params: {
  title: string;
  body: string;
  cta: string;
  ignore: string;
  actionLink: string;
  footerTagline: string;
}): string {
  const { title, body, cta, ignore, actionLink, footerTagline } = params;

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
      background-color: #000;
      color: #fff;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="font-size:36px;font-weight:800;letter-spacing:-0.02em;margin:0;color:#fff;">
                <span style="color:#6366F1;">P</span>ostio
              </h1>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:rgba(9,9,11,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;">
                <tr>
                  <td align="left" style="padding-bottom:16px;">
                    <h2 style="font-size:24px;font-weight:700;margin:0;color:#fff;">
                      ${title}
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-bottom:24px;">
                    <p style="font-size:16px;line-height:1.6;color:rgba(255,255,255,0.8);margin:0;">
                      ${body}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color:#6366F1;border-radius:12px;padding:0;">
                          <a href="${actionLink}"
                            style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;">
                            ${cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="left">
                    <p style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.5);margin:0;">
                      ${ignore}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0;">
                ${footerTagline}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
