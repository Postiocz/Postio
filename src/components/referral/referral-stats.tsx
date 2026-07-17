"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ReferralStatsProps {
  referralCode: string | null;
  totalReferrals: number;
  locale: string;
}

// "How it works" steps. Order and pastel palette are brand-specified.
const STEPS = [
  {
    n: 1,
    titleKey: "step1Title",
    descKey: "step1Desc",
    badge:
      "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30 shadow-[0_0_24px_rgba(99,102,241,0.35)]",
  },
  {
    n: 2,
    titleKey: "step2Title",
    descKey: "step2Desc",
    badge:
      "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30 shadow-[0_0_24px_rgba(139,92,246,0.35)]",
  },
  {
    n: 3,
    titleKey: "step3Title",
    descKey: "step3Desc",
    badge:
      "bg-pink-500/15 text-pink-300 ring-1 ring-pink-400/30 shadow-[0_0_24px_rgba(236,72,153,0.35)]",
  },
  {
    n: 4,
    titleKey: "step4Title",
    descKey: "step4Desc",
    badge:
      "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
  },
] as const;

export default function ReferralStats({
  referralCode,
  totalReferrals,
  locale,
}: ReferralStatsProps) {
  const t = useTranslations("referrals");
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const referralLink = referralCode
    ? `https://postio-app.cz/${locale}/login?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  };

  const fadeUp = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const cardClass =
    "rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-card/30 backdrop-blur-md p-5 sm:p-6";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* TOP SECTION: statistics */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className={`${cardClass} relative overflow-hidden`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/10 blur-3xl" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("totalReferrals")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {totalReferrals}
          </p>
        </div>

        <div className={`${cardClass} relative overflow-hidden`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("rewardsEarned")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {totalReferrals}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("rewardsSub")}</p>
        </div>
      </motion.div>

      {/* MIDDLE SECTION: share link */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className={cardClass}
      >
        <p className="text-sm font-medium text-muted-foreground">{t("yourLink")}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            value={referralLink}
            aria-label={t("yourLink")}
            className="w-full flex-1 rounded-[20px] border border-black/10 bg-white/80 px-4 py-2.5 text-sm text-foreground outline-none focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/40"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!referralLink}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </motion.div>

      {/* BOTTOM SECTION: how it works */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("howItWorks")}</h2>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={t("howItWorks")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10 sm:hidden"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        <div
          className={`mt-4 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${open ? "grid" : "hidden"} sm:grid`}
        >
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex flex-row items-start gap-4 text-left rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/40 dark:bg-card/20 p-5 sm:flex-col sm:items-center sm:text-center"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${step.badge}`}
              >
                {step.n}
              </div>
              <div className="flex flex-col gap-1 sm:items-center sm:gap-0">
                <p className="font-semibold text-foreground sm:mt-3">
                  {t(step.titleKey)}
                </p>
                <p className="text-sm text-muted-foreground sm:mt-1">{t(step.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
