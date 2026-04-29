import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getTranslations } from "next-intl/server";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6 flex justify-end">
        <LocaleSwitcher />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Postio</h1>
        <h2 className="mt-4 text-2xl font-semibold">{t("getStarted")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("getStartedSubtitle")}
        </p>
      </div>

      <GoogleSignInButton />
    </div>
  );
}
