import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl">
      <div className="mb-6 flex justify-end">
        <LocaleSwitcher />
      </div>

      <div className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-4xl font-extrabold text-transparent">
          Postio
        </h1>
        <h2 className="mt-4 text-2xl font-semibold">{t("getStarted")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("getStartedSubtitle")}
        </p>
      </div>

      <GoogleSignInButton />
    </div>
  );
}
