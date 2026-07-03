"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

type Locale = "cs" | "en" | "uk";

type EmailAuthState = {
  errorKey: "emailNotVerified" | "invalidCredentials" | "signInError" | "signUpError" | "emailAlreadyExists" | null;
  errorMessage: string | null;
  successKey: "checkEmailToVerify" | null;
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

  redirect(`/${locale}`);
}
