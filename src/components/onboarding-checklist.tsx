"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Plus,
  Link as LinkIcon,
  FileText,
  Flame,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface OnboardingStatus {
  hasAccounts: boolean;
  hasPosts: boolean;
}

/**
 * Floating Onboarding Checklist – guides new users through their first steps.
 *
 * Design: Glassmorphism card fixed at bottom-right (desktop) or top-right (mobile).
 * Shows 3 steps with progress indication:
 *   1. ✅ Account created (always done)
 *   2. ⭕ Connect first network (unlocks step 3)
 *   3. ⭕ Create first post (unlock after step 2)
 */
export default function OnboardingChecklist({
  locale,
  inline = false,
}: {
  locale: string;
  inline?: boolean;
}) {
  const t = useTranslations("dashboard");
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<OnboardingStatus>({
    hasAccounts: false,
    hasPosts: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const [accounts, posts] = await Promise.all([
          supabase
            .from("social_accounts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        if (!cancelled) {
          setStatus({
            hasAccounts: (accounts.count ?? 0) > 0,
            hasPosts: (posts.count ?? 0) > 0,
          });
          setIsLoaded(true);
        }
      } catch {
        // Fail silently – onboarding is decorative, not critical.
        setIsLoaded(true);
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  // Animation variants – fade in from right
  const fadeRight = {
    hidden: reduce
      ? { opacity: 1, x: 0 }
      : { opacity: 0, x: 40, transition: { duration: 0.5 } },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  if (!isLoaded) return null;

  // All steps done – nothing to show
  if (status.hasPosts) return null;

  const step2Complete = status.hasAccounts;
  const step3Complete = status.hasPosts;

  const cardClass =
    "rounded-[20px] border border-white/10 bg-card/80 backdrop-blur-md shadow-2xl";

  return (
    <motion.div
      variants={fadeRight}
      initial="hidden"
      animate="show"
      className={inline ? "w-full" : "fixed bottom-4 right-4 z-50 w-full max-w-[420px] p-4 sm:p-6"}
    >
      <div className={`${cardClass} overflow-hidden`}>
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-indigo-400">
                  {t("onboardingTitle")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("onboardingSubtitle")}
              </p>
            </div>
            <div className="flex items-center rounded-full bg-emerald-500/10 px-2 py-1">
              <Flame className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-500">
                {(step2Complete ? 1 : 0) + (step3Complete ? 1 : 0)}/2
              </span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 px-6 py-5">
          {/* Step 1: Account Created (always done) */}
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Check className="h-3 w-3" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {t("onboardingStep1")}
              </p>
            </div>
          </div>

          {/* Step 2: Connect Network */}
          <Link
            href={`/${locale}/accounts`}
            className={`group flex gap-3 rounded-[16px] p-2 transition-colors ${
              step2Complete
                ? "bg-emerald-500/5"
                : "hover:bg-white/5 cursor-pointer"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                step2Complete
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-500"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {step2Complete ? (
                <Check className="h-3 w-3" />
              ) : (
                <LinkIcon className="h-3 w-3" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  step2Complete
                    ? "text-emerald-400"
                    : "text-foreground group-hover:text-indigo-400"
                }`}
              >
                {t("onboardingStep2")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("onboardingStep2Desc")}
              </p>
            </div>
            {!step2Complete && (
              <div className="flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5">
                <Plus className="h-3 w-3 text-indigo-400" />
              </div>
            )}
          </Link>

          {/* Step 3: Create Post */}
          <Link
            href={`/${locale}/posts/new`}
            className={`group flex gap-3 rounded-[16px] p-2 transition-colors ${
              step3Complete
                ? "bg-emerald-500/5"
                : step2Complete
                  ? "cursor-pointer hover:bg-white/5"
                  : "cursor-not-allowed opacity-60"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                step3Complete
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-500"
                  : step2Complete
                    ? "border-muted-foreground/30 text-muted-foreground group-hover:border-indigo-400 group-hover:text-indigo-400"
                    : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {step3Complete ? (
                <Check className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  step3Complete
                    ? "text-emerald-400"
                    : step2Complete
                      ? "text-foreground group-hover:text-indigo-400"
                      : "text-muted-foreground"
                }`}
              >
                {t("onboardingStep3")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("onboardingStep3Desc")}
              </p>
            </div>
            {!step3Complete && step2Complete && (
              <div className="flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5">
                <Plus className="h-3 w-3 text-indigo-400" />
              </div>
            )}
          </Link>
        </div>

        {/* Decorative gradient footer */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30" />
      </div>
    </motion.div>
  );
}
