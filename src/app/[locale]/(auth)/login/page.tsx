import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginVisual } from "@/components/auth/login-visual";
import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="relative flex w-full min-h-screen">
      {/* Left: form panel – full width mobile, 40% desktop */}
      <div className="relative flex w-full min-h-[100dvh] pt-12 pb-48 lg:py-12 flex-col justify-between px-6 lg:w-[40%] lg:px-16 xl:px-24 lg:justify-center">
        <LocaleSwitcher className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50" />

        <div className="flex-1 flex items-center justify-center">
          <div className="mx-auto w-full max-w-[320px] lg:max-w-sm px-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            <span className="text-primary">P</span>ostio
          </h1>

          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("getStarted")}
          </h2>

          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {t("getStartedSubtitle")}
          </p>

          <div className="mt-12">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
      </div>

      {/* Right: visual panel – hidden on <lg, 60% on lg+ */}
      <div className="hidden w-[60%] lg:flex">
        <LoginVisual
          labels={{
            dashboard: t("visualDashboard"),
            thisWeek: t("visualThisWeek"),
            posts: t("visualPosts"),
            reach: t("visualReach"),
            engagement: t("visualEngagement"),
            scheduled: t("visualScheduled"),
            engagementUp: t("visualEngagementUp"),
          }}
        />
      </div>
    </div>
  );
}
