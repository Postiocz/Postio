import { EmailSignIn } from "@/components/auth/email-signin";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginVisual } from "@/components/auth/login-visual";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <div className="relative flex w-full min-h-screen bg-slate-50 dark:bg-black overflow-hidden">
      {/* Theme-adaptive background: 24x24 grid + indigo glow (subtler in light, stronger in dark) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
        <div className="absolute left-1/2 top-[-12%] h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[160px] dark:bg-indigo-500/35" />
      </div>

      {/* Left: form panel – full width mobile, 40% desktop */}
      <div className="relative z-10 flex w-full min-h-[100dvh] pt-12 pb-48 lg:py-12 flex-col justify-between px-6 lg:w-[40%] lg:px-16 xl:px-24 lg:justify-center">
        <LocaleSwitcher className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50" />

        <div className="flex-1 flex items-center justify-center">
          {/* Premium Light: white glass card */}
          <div className="mx-auto w-full max-w-md lg:max-w-md px-4 text-center">
            <div className="bg-white/60 dark:bg-transparent backdrop-blur-xl dark:backdrop-blur-none border border-white dark:border-transparent shadow-xl dark:shadow-none rounded-[32px] dark:rounded-none p-8 dark:p-0">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-5xl">
                <span className="text-primary">P</span>ostio
              </h1>

              <h2 className="mt-8 text-4xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {t("getStarted")}
              </h2>

              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("getStartedSubtitle")}
              </p>

              <div className="mt-12 space-y-6">
                <GoogleSignInButton />
                <div className="relative">
                  <EmailSignIn />
                  <div className="mt-4">
                    <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                      {t.rich("privacyDisclaimer", {
                        policy: (chunks) => (
                          <Link
                            href={`/${locale}/privacy`}
                            className="underline underline-offset-4"
                          >
                            {chunks}
                          </Link>
                        ),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: visual panel – hidden on <lg, 60% on lg+ */}
      <div className="relative z-10 hidden w-[60%] lg:flex">
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
