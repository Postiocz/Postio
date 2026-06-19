"use server";

import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateFullName(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const fullName = formData.get("full_name") as string;

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName.trim() || null })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function updateLanguage(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const language = formData.get("language") as string;

    const { error } = await supabase
      .from("users")
      .update({ language })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function updateBackupEmail(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const backupEmail = formData.get("backup_email") as string;

    const { error } = await supabase
      .from("users")
      .update({ backup_email: backupEmail.trim() || null })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings/profile");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function updatePassword(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const newPassword = formData.get("new_password") as string;

    if (!newPassword || newPassword.length < 6) {
      return { error: "Password must be at least 6 characters", success: false };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings/profile");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function generate2FASetup() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" as const, success: false };
    }

    const secret = generateSecret();
    const otpauthURL = generateURI({
      issuer: "Postio",
      label: user.email || "user",
      secret,
    });
    const qrCodeDataURL = await qrcode.toDataURL(otpauthURL);

    return {
      success: true,
      error: null,
      secret,
      qrCode: qrCodeDataURL,
      otpauthURL,
    };
  } catch {
    return { error: "Internal server error" as const, success: false };
  }
}

export async function confirm2FASetup(
  _prevState: { error: string | null; success: boolean; recoveryCodes?: string[] },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const totpCode = formData.get("totp_code") as string;
    const secret = formData.get("secret") as string;

    if (!totpCode || !secret) {
      return { error: "Missing required fields", success: false };
    }

    const isValid = await verify({ token: totpCode, secret });
    if (!isValid) {
      return { error: "invalid_code", success: false };
    }

    const recoveryCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 10)
    );

    const { error } = await supabase
      .from("users")
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_recovery_codes: recoveryCodes,
      })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings/profile");
    return { error: null, success: true, recoveryCodes };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function disable2FA(
  _prevState: { error: string | null; success: boolean },
  _formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const { error } = await supabase
      .from("users")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_recovery_codes: null,
      })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings/profile");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}

export async function deleteAccount(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", success: false };
    }

    const confirmation = formData.get("confirmation") as string;

    if (confirmation !== "DELETE") {
      return { error: "Confirmation text does not match", success: false };
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    await supabase.auth.signOut();
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}
