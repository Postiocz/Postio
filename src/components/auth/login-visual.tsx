"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface LoginVisualProps {
  labels?: {
    dashboard: string;
    thisWeek: string;
    posts: string;
    reach: string;
    engagement: string;
    scheduled: string;
    engagementUp: string;
  };
}

export function LoginVisual({ labels }: LoginVisualProps) {
  const l = {
    dashboard: "Dashboard",
    thisWeek: "This week",
    posts: "Posts",
    reach: "Reach",
    engagement: "Eng.",
    scheduled: "Post scheduled",
    engagementUp: "+24% engagement",
    ...labels,
  };

  const bars = [40, 65, 45, 80, 55, 70, 90];

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-visible p-8">
      {/* Card container — positioning context for floating badges */}
      <div className="relative w-full max-w-lg">
        {/* Card shell — unified with HeroDashboardPreview */}
        <div className="overflow-hidden rounded-[20px] border border-border bg-gradient-hero shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {/* Grid overlay — adaptive: gray in light, white in dark */}
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%23a0a0a0' stroke-width='0.5'/%3E%3C/svg%3E")`,
            }}
          />
          {/* Purple / indigo glow blobs — light: softer, dark: stronger */}
          <div className="absolute inset-0">
            <div className="absolute left-0 top-0 size-72 rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-500/20" />
            <div className="absolute bottom-0 right-0 size-64 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/15" />
          </div>

          {/* Dashboard card */}
          <div className="relative z-10 w-full p-5 sm:p-7">
            <motion.div
              {...fadeInUp}
              className="rounded-2xl border border-white/50 bg-white/50 p-5 shadow-lg backdrop-blur-md dark:border-white/15 dark:bg-white/5 dark:shadow-none sm:p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900 dark:text-white">{l.dashboard}</span>
                <span className="rounded-full bg-white/60 dark:bg-white/20 px-3 py-1 text-xs font-medium text-slate-700 dark:text-white">
                  {l.thisWeek}
                </span>
              </div>

              {/* Mock stat bars */}
              <div className="mb-6 flex h-32 items-end gap-2 sm:gap-3">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" as const }}
                    className={`flex-1 rounded-t-md ${
                      i % 2 === 0
                        ? "bg-slate-200/80 dark:bg-white/25"
                        : "bg-indigo-400/60 dark:bg-white/25"
                    }`}
                  />
                ))}
              </div>

              {/* Mock metric row */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-white/50 dark:bg-white/10 py-4 text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">128</div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
                    {l.posts}
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-white/50 dark:bg-white/10 py-4 text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">12.4K</div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
                    {l.reach}
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-white/50 dark:bg-white/10 py-4 text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">4.2%</div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
                    {l.engagement}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating badge — "Post scheduled" (above card, outside overflow-hidden shell) */}
        <motion.div
          animate={{
            y: [0, -6, 0],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
          }}
          className="absolute -top-4 left-4 rounded-2xl border border-white/60 dark:border-white/20 bg-white/50 dark:bg-white/5 px-5 py-3 backdrop-blur-md dark:backdrop-blur-xl shadow-md dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-300" />
            <span className="whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
              {l.scheduled}
            </span>
          </div>
        </motion.div>

        {/* Floating badge — "+24% engagement" (below card, outside overflow-hidden shell) */}
        <motion.div
          animate={{
            y: [0, 5, 0],
            transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
          }}
          className="absolute -bottom-4 right-4 rounded-2xl border border-white/60 dark:border-white/20 bg-white/50 dark:bg-white/5 px-5 py-3 backdrop-blur-md dark:backdrop-blur-xl shadow-md dark:shadow-none"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500 dark:text-amber-300" />
            <span className="whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
              {l.engagementUp}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
