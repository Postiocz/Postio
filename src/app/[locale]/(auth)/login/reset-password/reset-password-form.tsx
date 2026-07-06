"use client";

import { useState, useActionState } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { updatePasswordAction } from "@/lib/actions/auth";

interface ResetPasswordFormProps {
  locale: string;
  labels: {
    title: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePassword: string;
    updatingPassword: string;
    passwordUpdated: string;
    passwordsDoNotMatch: string;
    passwordTooShort: string;
    passwordUpdateError: string;
    backToSignIn: string;
  };
}

export function ResetPasswordForm({ locale, labels }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, isPending] = useActionState(updatePasswordAction, {
    errorKey: null,
    successKey: null,
  });

  // Map the server action's errorKey to a localized message.
  const errorText =
    state.errorKey === "passwordsDoNotMatch"
      ? labels.passwordsDoNotMatch
      : state.errorKey === "passwordTooShort"
      ? labels.passwordTooShort
      : state.errorKey === "passwordUpdateError"
      ? labels.passwordUpdateError
      : null;

  const isDone = state.successKey === "passwordUpdated";

  // Success view – password changed, offer a link back to sign in.
  if (isDone) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {labels.passwordUpdated}
        </p>
        <Link
          href={`/${locale}/login`}
          className="inline-flex w-full h-12 items-center justify-center rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all"
        >
          {labels.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={labels.newPassword}
            className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 pl-11 pr-12 text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
          <input
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={labels.confirmNewPassword}
            className="w-full bg-white/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl h-12 pl-11 pr-4 text-slate-900 dark:text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500 dark:focus:border-indigo-500/50 transition-all"
          />
        </div>

        {errorText && (
          <p className="text-xs text-center text-red-400/80">{errorText}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {labels.updatingPassword}
            </>
          ) : (
            labels.updatePassword
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          href={`/${locale}/login`}
          className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {labels.backToSignIn}
        </Link>
      </div>
    </div>
  );
}
