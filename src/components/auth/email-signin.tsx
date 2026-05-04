"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

type Mode = "signin" | "signup";

export function EmailSignIn() {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("email") && msg.includes("confirm")) {
          setErrorMessage(t("emailNotVerified"));
        } else if (msg.includes("invalid login")) {
          setErrorMessage(t("invalidCredentials"));
        } else {
          setErrorMessage(t("signInError"));
        }
      } else if (!data?.user?.email_confirmed_at) {
        setErrorMessage(t("emailNotVerified"));
        await supabase.auth.signOut();
      } else {
        const locale = window.location.pathname.split("/")[1] || "cs";
        window.location.href = `/${locale}`;
      }
    } catch {
      setErrorMessage(t("signInError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${
            window.location.pathname.split("/")[1] || "cs"
          }/dashboard`,
        },
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("already")) {
          setErrorMessage(t("emailAlreadyExists"));
        } else {
          setErrorMessage(t("signUpError"));
        }
      } else if (data.user && !data.user.email_confirmed_at) {
        setSuccessMessage(t("checkEmailToVerify"));
        setEmail("");
        setPassword("");
        setMode("signin");
      }
    } catch {
      setErrorMessage(t("signUpError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-muted-foreground/60">{t("or")}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form
        onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
        className="space-y-3"
      >
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl h-12 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={t("password")}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl h-12 pl-11 pr-12 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:border-indigo-500/50 transition-all"
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
            loading ||
            !isSupabaseConfigured ||
            !email.trim() ||
            !password.trim()
          }
          className="w-full h-12 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading
            ? mode === "signin"
              ? t("signingIn")
              : t("creatingAccount")
            : mode === "signin"
            ? t("signIn")
            : t("signUp")}
        </button>
      </form>

      {mode === "signin" && (
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("forgotPassword")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
              setSuccessMessage(null);
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
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t("haveAccount")}
          </button>
        </div>
      )}

      {(errorMessage || successMessage) && (
        <p
          className={`text-xs text-center leading-relaxed ${
            successMessage
              ? "text-green-400/80"
              : "text-muted-foreground/70"
          }`}
        >
          {errorMessage || successMessage}
        </p>
      )}
    </div>
  );
}
