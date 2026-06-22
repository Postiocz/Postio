"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { cs } from "date-fns/locale";

interface MiniCalendarProps {
  /**
   * Aktualne vybrane datum v hlavnim kalendari.
   * Mini kalendar ho pouzije pro highlight (modry outline).
   */
  selectedDate: Date;
  /**
   * Callback pri kliknuti na den – dostane nove vybrane datum.
   */
  onSelectDate: (date: Date) => void;
  /**
   * Callback pri zmene mesice v mini kalendari – parent muze zareagovat
   * (napr. posun `currentDate` v hlavnim kalendari).
   */
  onMonthChange?: (month: Date) => void;
  /**
   * Zkratky dnu v tydnu (Po, Ut, St, ...) – lokalizovane z messages.
   * Pokud nejsou k dispozici, pouziji se anglicke zkratky.
   */
  weekdayShort?: string[];
  /**
   * Pole nazvu mesicu (Leden, Unor, ...) – lokalizovane z messages.
   */
  months?: string[];
  /**
   * Locale pro date-fns format (napr. "cs" pro cesky locale v date-fns).
   */
  locale?: string;
}

/**
 * Mini kalendar – sidebarova komponenta pro rychly vyber data.
 *
 * Vizual: Glassmorphism karta s vlastnim mesicnim gridem. Dnes = gradient
 * krouzek. Vybrany den = indigo outline. Dny z jineho mesice = tlumene.
 *
 * Nemuze byt pouzit jako samostatny state – je to derivace `selectedDate`
 * v parentovi; parent si drzi "currentDate" a mini kalendar ho jen posouva.
 */
export function MiniCalendar({
  selectedDate,
  onSelectDate,
  onMonthChange,
  weekdayShort,
  months,
  locale = "en",
}: MiniCalendarProps) {
  // Interni state pro mesic, ktery mini kalendar prave ukazuje.
  // Default = mesic z selectedDate; pokud parent posune currentDate, mini
  // kalendar to zaregistruje pres useEffect nize.
  const [miniMonth, setMiniMonth] = useState<Date>(
    startOfMonth(selectedDate)
  );

  // Pokud parent posune currentDate do jineho mesice, mini kalendar nasleduje.
  // useEffect je nutny – setState behem renderu by zpusobil infinite loop.
  useEffect(() => {
    if (!isSameMonth(miniMonth, selectedDate)) {
      setMiniMonth(startOfMonth(selectedDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const monthStart = useMemo(() => startOfMonth(miniMonth), [miniMonth]);
  const monthEnd = useMemo(() => endOfMonth(miniMonth), [miniMonth]);
  const gridStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn: 1 }),
    [monthStart]
  );
  const gridEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn: 1 }),
    [monthEnd]
  );

  const days = useMemo(() => {
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const handlePrevMonth = () => {
    const next = subMonths(miniMonth, 1);
    setMiniMonth(next);
    onMonthChange?.(next);
  };
  const handleNextMonth = () => {
    const next = addMonths(miniMonth, 1);
    setMiniMonth(next);
    onMonthChange?.(next);
  };

  // Vyuzijeme date-fns cs locale pokud je v parametru
  const dfnsLocale = locale === "cs" ? cs : undefined;

  // Zkratky dnu – z weekdays[0..6] vytvorime 2-pismenne
  // (Po, Ut, St, ...). Pokud parent nepreda weekdayShort, pouzijeme vychozi
  // anglicke.
  const defaultShort = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const weekLabels = weekdayShort ?? defaultShort;

  // Nazev mesice a rok v hlavicce
  const monthLabel = useMemo(() => {
    if (months && months[miniMonth.getMonth()]) {
      return `${months[miniMonth.getMonth()]} ${miniMonth.getFullYear()}`;
    }
    return format(miniMonth, "LLLL yyyy", { locale: dfnsLocale });
  }, [miniMonth, months, dfnsLocale]);

  return (
    <div
      className={cn(
        "rounded-[20px] border border-black/[0.08] bg-white/70 p-4 backdrop-blur-md",
        "dark:border-white/[0.06] dark:bg-card/40",
        "shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl"
      )}
    >
      {/* Hlavicka: nazev mesice + sipky pro zmenu mesice */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white/40 text-muted-foreground transition-all hover:bg-white/70 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold tracking-tight text-foreground capitalize">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white/40 text-muted-foreground transition-all hover:bg-white/70 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hlavicky dnu */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekLabels.map((d, i) => (
          <div
            key={i}
            className="flex h-6 items-center justify-center text-[10px] font-medium text-muted-foreground/50"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Dny */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, miniMonth);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative flex h-7 w-full items-center justify-center rounded-lg text-[11px] font-medium transition-all",
                !inMonth && "text-muted-foreground/30",
                inMonth && !selected && !today && "text-foreground hover:bg-white/60 dark:hover:bg-white/[0.06]",
                today &&
                  "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]",
                selected &&
                  !today &&
                  "ring-1 ring-inset ring-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
                selected && today && "ring-2 ring-indigo-300/60"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
