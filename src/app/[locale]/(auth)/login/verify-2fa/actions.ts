"use server";

import { verify } from "otplib";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function verify2FACode(
  _prevState: { error: string },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "not_authenticated" };
    }

    const code = formData.get("code") as string;
    const mode = formData.get("mode") as string | null;

    if (!code) {
      return { error: "invalid_code" };
    }

    // Fetch user's 2FA data from database
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("two_factor_secret, two_factor_recovery_codes, two_factor_enabled")
      .eq("id", user.id)
      .single();

    if (dbError || !userData) {
      return { error: "database_error" };
    }

    if (!userData.two_factor_enabled) {
      // 2FA is not enabled, redirect to dashboard
      const locale = formData.get("locale") as string;
      redirect(`/${locale}/dashboard`);
    }

    // Recovery code mode
    if (mode === "recovery") {
      const recoveryCodes = userData.two_factor_recovery_codes as string[] | null;
      if (!recoveryCodes || !recoveryCodes.includes(code.trim())) {
        return { error: "invalid_recovery_code" };
      }

      // Remove used recovery code
      const remainingCodes = recoveryCodes.filter((c: string) => c !== code.trim());

      const { error: updateError } = await supabase
        .from("users")
        .update({
          two_factor_recovery_codes: remainingCodes.length > 0 ? remainingCodes : null,
        })
        .eq("id", user.id);

      if (updateError) {
        return { error: "database_error" };
      }

      const locale = formData.get("locale") as string;
      redirect(`/${locale}/dashboard`);
    }

    // TOTP verification
    const secret = userData.two_factor_secret as string | null;
    if (!secret) {
      return { error: "no_secret" };
    }

    const result = await verify({ token: code.trim(), secret });
    const isValid = typeof result === "boolean" ? result : result.valid;

    if (!isValid) {
      return { error: "invalid_code" };
    }

    const locale = formData.get("locale") as string;
    redirect(`/${locale}`);
  } catch (e) {
    // Re-throw Next.js redirect errors so they are handled properly
    if (e instanceof Error && e.message === "NEXT_REDIRECT") {
      throw e;
    }
    return { error: "internal_error" };
  }
}

export async function signOutFrom2FA(
  locale: string
) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
