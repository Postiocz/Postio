"use client";

/**
 * Recovery handler – turns the reset-password magic link into a session.
 *
 * Server routes cannot read URL fragments, but Supabase recovery links
 * (`admin.generateLink`) deliver the session as `#access_token` (implicit
 * flow). This client page reads the fragment, establishes the session via
 * the browser client (which writes the auth cookies through @supabase/ssr),
 * and then forwards the user to /<locale>/login/reset-password.
 *
 * A PKCE `?code=` fallback is kept for flows that exchange a one-time code.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function RecoveryPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const url = new URL(window.location.href);
    const locale = url.pathname.split("/")[1] || "cs";
    const nextParam = url.searchParams.get("next");
    const resetPath =
      nextParam && /^\/(cs|en|uk)\//.test(nextParam)
        ? nextParam
        : `/${locale}/login/reset-password`;

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = url.searchParams.get("code");

    async function run() {
      const supabase = createClient();

      // Implicit flow – tokens arrive in the URL hash.
      if (accessToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? "",
        });
        if (cancelled) return;
        if (error) {
          setMessage(error.message);
          setStatus("error");
          return;
        }
        router.replace(resetPath);
        return;
      }

      // PKCE fallback – one-time `code` in the query.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setMessage(error.message);
          setStatus("error");
          return;
        }
        router.replace(resetPath);
        return;
      }

      setMessage(t("recoveryLinkInvalid"));
      setStatus("error");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {status === "processing" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground">{t("recoveryVerifying")}</p>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-500">{message}</p>
            <button
              type="button"
              onClick={() => router.replace(`/${window.location.pathname.split("/")[1] || "cs"}/login`)}
              className="text-sm text-muted-foreground underline underline-offset-3 hover:text-foreground transition-colors"
            >
              {t("backToSignIn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
