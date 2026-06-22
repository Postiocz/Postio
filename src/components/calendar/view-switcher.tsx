"use client";

import { cn } from "@/lib/utils";
import { List, Calendar as CalendarIcon, Columns, Grid3x3, Globe } from "lucide-react";

export type CalendarViewMode = "agenda" | "day" | "week" | "month" | "year";

interface ViewSwitcherProps {
  value: CalendarViewMode;
  onChange: (value: CalendarViewMode) => void;
  t: {
    agenda: string;
    day: string;
    week: string;
    month: string;
    year: string;
  };
}

/**
 * Prepinac pohledu kalendare (Agenda / Day / Week / Month / Year).
 *
 * Vizualne konzistentni s existujicim prepinacem v `_calendar-view.tsx`,
 * ktery nyni nahradi – cilem je sjednotit Month/Week s novymi rezimy
 * (Day, Agenda, Year).
 *
 * Glassmorphism, radius 20px, aktivni tlacitko = bile pozadi + tmavy text
 * (konzistentni s Postio design systemem, kde aktivni = "primary").
 */
export function ViewSwitcher({ value, onChange, t }: ViewSwitcherProps) {
  const views: Array<{ id: CalendarViewMode; label: string; icon: typeof List }> = [
    { id: "agenda", label: t.agenda, icon: List },
    { id: "day", label: t.day, icon: Columns },
    { id: "week", label: t.week, icon: CalendarIcon },
    { id: "month", label: t.month, icon: Grid3x3 },
    { id: "year", label: t.year, icon: Globe },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[20px] border border-black/[0.08] bg-white/70 p-1 backdrop-blur-md",
        "dark:border-white/[0.06] dark:bg-card/40"
      )}
      role="tablist"
    >
      {views.map((v) => {
        const Icon = v.icon;
        const isActive = v.id === value;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(v.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[14px] px-3 py-1.5 text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                : "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/[0.05]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
