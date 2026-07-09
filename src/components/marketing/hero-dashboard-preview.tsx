"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

// Derived variant of the login visual for the marketing hero.
// Shares the glass + purple-gradient language but shows a DIFFERENT scene
// (dashboard stats + a scheduled posting queue) so the landing page does not
// duplicate the login mockup 1:1. Fully responsive: scales with its container
// (w-full, no fixed px width, no scale transforms). overflow-hidden lives only
// on the card itself so its gradient/glow clips, never its own content.
export function HeroDashboardPreview() {
  const t = useTranslations("landing.heroPreview");
  const bars = [38, 62, 48, 82, 56, 72, 94];

  // Platform badges (lucide dropped brand icons, so we use initial chips).
  const queue = [
    { badge: "IG", name: "Instagram", time: "09:00", color: "bg-pink-500", text: "text-white" },
    { badge: "FB", name: "Facebook", time: "12:30", color: "bg-blue-500", text: "text-white" },
    { badge: "IN", name: "LinkedIn", time: "15:00", color: "bg-sky-500", text: "text-white" },
    { badge: "X", name: "X", time: "18:15", color: "bg-slate-800 dark:bg-slate-200", text: "text-white dark:text-slate-900" },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-[20px] border border-border bg-gradient-hero shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      {/* Grid overlay (adaptive: gray in light, white in dark) */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%23a0a0a0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Purple / indigo glow blobs – light: softer, dark: stronger */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 size-72 rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-500/20" />
        <div className="absolute bottom-0 right-0 size-64 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/15" />
      </div>

      <div className="relative z-10 w-full p-5 sm:p-7">
        {/* Main dashboard card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/50 bg-white/50 p-5 shadow-lg backdrop-blur-md dark:border-white/15 dark:bg-white/5 dark:shadow-none sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard")}</span>
            <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-white/15 dark:text-white">
              {t("thisWeek")}
            </span>
          </div>

          {/* Bar chart */}
          <div className="mb-4 flex h-24 items-end gap-1.5 sm:gap-2">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                className={`flex-1 rounded-t-md ${i % 2 === 0 ? "bg-slate-200/80 dark:bg-white/25" : "bg-indigo-400/70 dark:bg-white/25"}`}
              />
            ))}
          </div>

          {/* Metric row */}
          <div className="grid grid-cols-3 gap-2">
            {[["128", t("posts")], ["12.4K", t("reach")], ["4.2%", t("eng")]].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-white/50 py-3 text-center dark:bg-white/10">
                <div className="text-base font-bold text-slate-900 dark:text-white sm:text-xl">{value}</div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scheduled queue – the scene that differs from the login visual */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-3 flex items-center gap-2 rounded-2xl border border-white/50 bg-white/50 px-4 py-3 shadow-md backdrop-blur-md dark:border-white/15 dark:bg-white/5 dark:shadow-none sm:mt-4"
        >
          <CalendarDays className="size-5 shrink-0 text-indigo-500 dark:text-indigo-300" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/60">
              {t("scheduledQueue")}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {queue.map((q) => (
                <span
                  key={q.name}
                  className="flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-white"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${q.color} ${q.text}`}>
                    {q.badge}
                  </span>
                  {q.name} · {q.time}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
