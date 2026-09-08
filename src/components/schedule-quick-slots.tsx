"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getNextAvailableQueueSlot } from "@/lib/actions/queue";
import { Loader2, CalendarClock } from "lucide-react";

/**
 * Quick scheduling slots shown under the DateTimePicker so the user can pick
 * a sensible time without opening the calendar every time.
 *
 *   • Queue – the next free slot from the posting schedule (fetched once).
 *   • Today 18:00 – disabled once 18:00 is already in the past.
 *   • Tomorrow 09:00 – always available.
 *
 * Clicking a chip calls `onSelect` with a pre-formatted ISO timestamp that
 * matches `normalizeScheduledAt` in the editor. The active chip (one whose
 * computed time equals `value`) is highlighted; the picker remains fully
 * editable and takes priority over the chips.
 */
export function ScheduleQuickSlots({
  value,
  onSelect,
  locale = "en",
  labels,
}: {
  value: string;
  onSelect: (iso: string) => void;
  locale?: string;
  labels: {
    queue: string;
    today18: string;
    tomorrow9: string;
    queueLoading: string;
    wordToday: string;
    wordTomorrow: string;
  };
}) {
  // Next free queue slot, fetched lazily on mount so the chip can show the
  // resolved time instead of a generic label.
  const [queueAt, setQueueAt] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getNextAvailableQueueSlot();
        if (!cancelled && res.success && res.scheduledAt) {
          setQueueAt(res.scheduledAt);
        }
      } catch {
        // non-fatal – chip falls back to the generic label
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today18 = (() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    d.setMilliseconds(0);
    return d;
  })();
  const tomorrow9 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    d.setMilliseconds(0);
    return d;
  })();

  const today18Iso = today18.toISOString();
  const tomorrow9Iso = tomorrow9.toISOString();
  const today18Disabled = new Date().getTime() >= today18.getTime();

  const fmtTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString(
        locale && locale !== "en" ? `${locale}-${locale.toUpperCase()}` : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      );
    } catch {
      return "";
    }
  };

  const fmtDay = (iso: string): string => {
    if (!iso) return "";
    try {
      const target = new Date(iso);
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const dayDiff = Math.round((startTarget.getTime() - startToday.getTime()) / 86_400_000);
      if (dayDiff === 0) return labels.wordToday;
      if (dayDiff === 1) return labels.wordTomorrow;
      return target.toLocaleDateString(
        locale && locale !== "en" ? `${locale}-${locale.toUpperCase()}` : "en-US",
        { weekday: "short" },
      );
    } catch {
      return "";
    }
  };

  const isActive = (iso: string): boolean => {
    if (!value || !iso) return false;
    const a = Date.parse(value);
    const b = Date.parse(iso);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    // Same-minute match so the chip keeps its highlight even when the
    // picker or queue action rewrites the ISO with different seconds/ms.
    return Math.abs(a - b) < 60_000;
  };

  const chip = (
    iso: string,
    label: string,
    { disabled = false, load = false }: { disabled?: boolean; load?: boolean } = {},
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (isActive(iso) && !disabled ? onSelect("") : onSelect(iso))}
      aria-pressed={isActive(iso) && !disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
        isActive(iso) && !disabled
          ? "border-indigo-500/70 bg-indigo-500/20 text-indigo-700 shadow-[0_0_14px_rgba(99,102,241,0.35)] dark:border-indigo-500/90 dark:bg-indigo-500/30 dark:text-indigo-200"
          : "border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] text-slate-700 dark:text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {load ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {chip(queueAt ?? "", queueLoading ? labels.queueLoading : `${fmtDay(queueAt ?? "")} · ${fmtTime(queueAt ?? "")}`, {
        load: queueLoading,
        disabled: !queueAt,
      })}
      {chip(today18Iso, labels.today18, { disabled: today18Disabled })}
      {chip(tomorrow9Iso, labels.tomorrow9)}
    </div>
  );
}