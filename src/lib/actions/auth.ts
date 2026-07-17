"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { applyReferral, REFERRAL_COOKIE } from "@/lib/referral";

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
        emailRedirectTo: `${baseUrl}/auth/callback`,
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
// Password reset – Step 1: send the recovery e-mail
// ============================================================
// Triggered from the "Forgot password?" view in `email-signin.tsx`.
// Supabase e-mails a magic link that lands on `/auth/callback` with
// `?type=recovery`, which the callback route redirects to the
// `/login/reset-password` page where the user sets a new password.
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

  const supabase = await createClient();

  // The `redirectTo` includes `type=recovery` so the callback route can tell
  // this apart from OAuth / e-mail-verification flows and forward the user to
  // the reset-password page (see Step 5 of the plan).
  const redirectTo = `${baseUrl}/auth/callback?type=recovery&next=${encodeURIComponent(
    `/${locale}/login/reset-password`
  )}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { errorKey: "resetError", errorMessage: error.message, successKey: null };
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
