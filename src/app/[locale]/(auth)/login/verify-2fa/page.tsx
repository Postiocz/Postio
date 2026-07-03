import { ArrowLeft } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getTranslations } from "next-intl/server";
import { VerifyForm } from "./verify-form";
import { signOutFrom2FA } from "./actions";
import Link from "next/link";

export default async function Verify2FAPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  const labels = {
    title: t("verify2FATitle"),
    subtitle: t("verify2FASubtitle"),
    placeholder: t("verify2FAPlaceholder"),
    submit: t("verify2FASubmit"),
    verifying: t("verify2FAVerifying"),
    error: t("verify2FAError"),
    retry: t("verify2FARetry"),
    backToLogin: t("verify2FABackToLogin"),
    useRecoveryCode: t("verify2FAUseRecoveryCode"),
    recoveryCodeTitle: t("verify2FARecoveryCodeTitle"),
    recoveryCodeDesc: t("verify2FARecoveryCodeDesc"),
    recoveryCodePlaceholder: t("verify2FARecoveryCodePlaceholder"),
    recoveryCodeSubmit: t("verify2FARecoveryCodeSubmit"),
    switchToTOTP: t("verify2FASwitchToTOTP"),
  };

  return (
    <div className="relative flex w-full min-h-screen bg-slate-50 dark:bg-black">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 bg-slate-200/50 dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%23a0a0a0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Centered form */}
      <div className="relative flex w-full min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
        <LocaleSwitcher className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50" />

        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              <span className="text-primary">P</span>ostio
            </h1>
          </div>

          {/* Glassmorphism Card */}
          <div className="bg-white/60 dark:bg-transparent backdrop-blur-xl dark:backdrop-blur-none border border-white dark:border-transparent shadow-xl dark:shadow-none rounded-[32px] dark:rounded-none p-8 dark:p-0">
            <VerifyForm locale={locale} labels={labels} />

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                href={`/${locale}/login`}
                className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {labels.backToLogin}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
