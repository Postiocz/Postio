"use client";

import { useEffect, useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { emailAuthAction, resetPasswordAction } from "@/lib/actions/auth";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !(
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? ""
  ).includes("placeholder");

type Mode = "signin" | "signup" | "forgot";

export function EmailSignIn() {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, isPending] = useActionState(emailAuthAction, {
    errorKey: null,
    errorMessage: null,
    successKey: null,
  });

  // Separate action state for the "forgot password" flow so the reset
  // form does not clash with the sign-in / sign-up submission above.
  const [resetState, resetFormAction, isResetPending] = useActionState(
    resetPasswordAction,
    {
      errorKey: null,
      errorMessage: null,
      successKey: null,
    }
  );

  useEffect(() => {
    if (state.successKey) {
      // Reset the form back to the sign-in view after a successful signup
      // (email-confirmation) submission. Syncing UI to the action result is
      // an intentional, benign use of setState in an effect here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("signin");
      setEmail("");
      setPassword("");
    }
  }, [state.successKey]);

  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] || "cs"
      : "cs";

  // Error / success text is derived from whichever flow is currently active.
  const errorText =
    mode === "forgot"
      ? resetState.errorKey
        ? t(resetState.errorKey)
        : resetState.errorMessage
      : state.errorKey
      ? t(state.errorKey)
      : state.errorMessage;
  const successText =
    mode === "forgot"
      ? resetState.successKey
        ? t(resetState.successKey)
        : null
      : state.successKey
      ? t(state.successKey)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="text-xs text-muted-foreground/60">{t("or")}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      {mode === "forgot" ? (
        <form action={resetFormAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-foreground">
              {t("forgotPasswordTitle")}
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              {t("forgotPasswordDescription")}
            </p>
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 pl-11 pr-4 text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isResetPending || !isSupabaseConfigured || !email.trim()}
            className="w-full h-12 rounded-2xl bg-indigo-500 dark:bg-white text-white dark:text-black font-semibold hover:bg-indigo-600 dark:hover:bg-white/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isResetPending ? t("sendingResetLink") : t("sendResetLink")}
          </button>
        </form>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value={mode} />

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 pl-11 pr-4 text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
            <input
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={t("password")}
              className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 pl-11 pr-12 text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={
              isPending ||
              !isSupabaseConfigured ||
              !email.trim() ||
              !password.trim()
            }
            className="w-full h-12 rounded-2xl bg-indigo-500 dark:bg-white text-white dark:text-black font-semibold hover:bg-indigo-600 dark:hover:bg-white/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending
              ? mode === "signin"
                ? t("signingIn")
                : t("creatingAccount")
              : mode === "signin"
              ? t("signIn")
              : t("signUp")}
          </button>
        </form>
      )}

      {mode === "signin" && (
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setPassword("");
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("forgotPassword")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("noAccount")}
          </button>
        </div>
      )}

      {mode === "signup" && (
        <div className="flex items-center justify-center text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("haveAccount")}
          </button>
        </div>
      )}

      {mode === "forgot" && (
        <div className="flex items-center justify-center text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("backToSignIn")}
          </button>
        </div>
      )}

      {(errorText || successText) && (
        <p
          className={`text-xs text-center leading-relaxed ${
            successText
              ? "text-green-400/80"
              : "text-muted-foreground/70"
          }`}
        >
          {errorText || successText}
        </p>
      )}
    </div>
  );
}
