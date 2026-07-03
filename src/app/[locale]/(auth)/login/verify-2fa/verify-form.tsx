"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Shield, KeyRound, ArrowLeft, Loader2 } from "lucide-react";
import { verify2FACode } from "./actions";

type Mode = "totp" | "recovery";

interface VerifyFormProps {
  locale: string;
  labels: {
    title: string;
    subtitle: string;
    placeholder: string;
    submit: string;
    verifying: string;
    error: string;
    retry: string;
    backToLogin: string;
    useRecoveryCode: string;
    recoveryCodeTitle: string;
    recoveryCodeDesc: string;
    recoveryCodePlaceholder: string;
    recoveryCodeSubmit: string;
    switchToTOTP: string;
  };
}

export function VerifyForm({ locale, labels }: VerifyFormProps) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("totp");

  const [state, formAction, isPending] = useActionState(verify2FACode, {
    error: "",
  });

  const switchMode = () => {
    setMode(mode === "totp" ? "recovery" : "totp");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "totp" ? labels.subtitle : labels.recoveryCodeDesc}
          </p>
        </div>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value={mode} />

        <div className="space-y-2">
          <div className="flex justify-center gap-2">
            {Array.from({ length: mode === "totp" ? 6 : 8 }, (_, i) => (
              <div
                key={i}
                className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl sm:text-2xl font-mono text-foreground"
              />
            ))}
          </div>

          <input
            type="text"
            name="code"
            inputMode={mode === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={mode === "totp" ? 6 : 20}
            placeholder={mode === "totp" ? labels.placeholder : labels.recoveryCodePlaceholder}
            className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 text-center text-xl font-mono tracking-[0.5em] text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
          />
        </div>

        {state?.error && state.error !== "" && (
          <p className="text-xs text-center text-red-400/80">
            {mode === "recovery" && state.error === "invalid_recovery_code"
              ? t("verify2FARecoveryCodeError")
              : labels.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {labels.verifying}
            </>
          ) : mode === "totp" ? (
            labels.submit
          ) : (
            labels.recoveryCodeSubmit
          )}
        </button>
      </form>

      {/* Mode Switcher */}
      <div className="text-center">
        <button
          type="button"
          onClick={switchMode}
          className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5"
        >
          {mode === "totp" ? (
            <>
              <KeyRound className="w-3.5 h-3.5" />
              {labels.useRecoveryCode}
            </>
          ) : (
            <>
              <ArrowLeft className="w-3.5 h-3.5" />
              {labels.switchToTOTP}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
