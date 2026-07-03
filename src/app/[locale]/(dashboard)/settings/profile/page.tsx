import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  const authT = await getTranslations({ locale, namespace: "auth" });
  const commonT = await getTranslations({ locale, namespace: "common" });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName = "";
  let email = "";
  let emailVerified = false;
  let language = "cs";
  let avatarUrl: string | null = null;
  let backupEmail = "";
  let twoFactorEnabled = false;

  if (user) {
    email = user.email ?? "";
    emailVerified = !!user.email_confirmed_at;

    const { data: userData } = await supabase
      .from("users")
      .select("full_name, language, avatar_url, backup_email, two_factor_enabled")
      .eq("id", user.id)
      .single();

    if (userData) {
      fullName = userData.full_name ?? user.email?.split("@")[0] ?? "";
      language = userData.language ?? "cs";
      avatarUrl = userData.avatar_url ?? null;
      backupEmail = userData.backup_email ?? "";
      twoFactorEnabled = userData.two_factor_enabled ?? false;
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t("profile")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("profileDescription")}
        </p>
      </div>

      <ProfileForm
        fullName={fullName}
        email={email}
        emailVerified={emailVerified}
        language={language}
        avatarUrl={avatarUrl}
        backupEmail={backupEmail}
        twoFactorEnabled={twoFactorEnabled}
        locale={locale}
        labels={{
          email: authT("email"),
          emailVerified: authT("emailVerified"),
          emailNotVerifiedBadge: authT("emailNotVerifiedBadge"),
          fullName: t("fullName"),
          language: t("language"),
          saved: t("saved"),
          photo: t("photo"),
          uploadPhoto: t("uploadPhoto"),
          photoDescription: t("photoDescription"),
          uploading: t("uploading"),
          backupEmail: t("backupEmail"),
          backupEmailPlaceholder: t("backupEmailPlaceholder"),
          backupEmailDescription: t("backupEmailDescription"),
          password: t("password"),
          changePassword: t("changePassword"),
          newPassword: t("newPassword"),
          confirmPassword: t("confirmPassword"),
          twoFactorAuth: t("twoFactorAuth"),
          twoFactorAuthDescription: t("twoFactorAuthDescription"),
          twoFactorEnabled: t("twoFactorEnabled"),
          twoFactorDisabled: t("twoFactorDisabled"),
          enable2FA: t("enable2FA"),
          disable2FA: t("disable2FA"),
          twoFASuccess: t("twoFASuccess"),
          dangerZone: t("dangerZone"),
          dangerZoneDesc: t("dangerZoneDesc"),
          deleteAccount: t("deleteAccount"),
          confirmPasswordDelete: t("confirmPasswordDelete"),
          deleteAccountConfirm: t("deleteAccountConfirm"),
          deletingAccount: t("deletingAccount"),
          switch: commonT("switch"),
          loading: commonT("loading"),
          save: commonT("save"),
        }}
      />
    </div>
  );
}
