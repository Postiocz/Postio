"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Check, X, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SetupTask {
  id: string;
  labelKey: string;
  isCompleted: boolean;
}

interface SetupGuideProps {
  locale: string;
}

export default function SetupGuide({ locale }: SetupGuideProps) {
  const t = useTranslations("setup");
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const [tasks, setTasks] = useState<SetupTask[]>([
    { id: "create_account", labelKey: "createAccount", isCompleted: true },
    { id: "connect_first_network", labelKey: "connectFirstNetwork", isCompleted: false },
    { id: "save_first_idea", labelKey: "saveFirstIdea", isCompleted: false },
    { id: "schedule_first_post", labelKey: "scheduleFirstPost", isCompleted: false },
  ]);

  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("setup-dismissed") === "true");
    setReady(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("setup-dismissed", "true");
  }, []);

  useEffect(() => {
    if (!ready || dismissed) return;
    let cancelled = false;
    const checkProgress = async () => {
      try {
        const [accountsData, postsData] = await Promise.all([
          supabase.from("social_accounts").select("*", { count: "exact", head: true }),
          supabase.from("posts").select("*", { count: "exact", head: true }),
        ]);

        const hasAccounts = (accountsData.count ?? 0) > 0;
        const hasPosts = (postsData.count ?? 0) > 0;

        if (cancelled) return;
        setTasks((prev) =>
          prev.map((task) => {
            if (task.id === "connect_first_network") return { ...task, isCompleted: hasAccounts };
            if (task.id === "save_first_idea" || task.id === "schedule_first_post") return { ...task, isCompleted: hasPosts };
            return task;
          })
        );
      } catch {
        // Supabase unavailable
      }
    };

    void checkProgress();

    const onFocus = () => {
      void checkProgress();
    };

    window.addEventListener("focus", onFocus);
    const intervalId = window.setInterval(() => {
      void checkProgress();
    }, 8000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(intervalId);
    };
  }, [dismissed, ready, supabase]);

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const progressPercent = (completedCount / totalCount) * 100;

  if (!ready || completedCount === totalCount || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6 lg:bottom-6 lg:right-6 max-w-[380px] w-full pointer-events-auto"
    >
      <div className="bg-card/40 dark:bg-card/40 backdrop-blur-xl border border-white/10 dark:border-white/10 rounded-[24px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} {t("progress", { current: completedCount, total: totalCount })}
            </span>
            <span className="text-xs font-medium text-indigo-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
                task.isCompleted
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/5 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all",
                  task.isCompleted
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-white/20"
                )}
              >
                {task.isCompleted && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className={cn("flex-1", task.isCompleted && "line-through opacity-70")}>
                {t(task.labelKey)}
              </span>
              {!task.isCompleted && <ChevronRight className="h-3 w-3 opacity-40" />}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
