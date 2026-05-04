"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
} from "date-fns";
import { cs, enUS, uk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  locale?: string;
  className?: string;
};

const weekDaysCs = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const weekDaysEn = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const weekDaysUk = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function getLocale(locale: string | undefined) {
  if (locale === "cs") return cs;
  if (locale === "uk") return uk;
  return enUS;
}

function getWeekDays(locale: string | undefined): string[] {
  if (locale === "cs") return weekDaysCs;
  if (locale === "uk") return weekDaysUk;
  return weekDaysEn;
}

export function DateTimePicker({
  value,
  onChange,
  locale = "en",
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    value ? new Date(value) : null
  );
  const [selectedHour, setSelectedHour] = React.useState(
    value ? new Date(value).getHours() : 12
  );
  const [selectedMinute, setSelectedMinute] = React.useState(
    value ? new Date(value).getMinutes() : 0
  );

  const dateLocale = getLocale(locale);
  const weekDays = getWeekDays(locale);

  const monthStart = startOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (isSameDay(day, calendarEnd) || day < calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleDayClick = (d: Date) => {
    const newDate = new Date(d);
    newDate.setHours(selectedHour, selectedMinute, 0, 0);
    setSelectedDate(newDate);
    const iso = newDate.toISOString().slice(0, 16);
    onChange(iso);
  };

  const handleTimeChange = () => {
    const base = selectedDate || new Date();
    const newDate = new Date(base);
    newDate.setHours(selectedHour, selectedMinute, 0, 0);
    setSelectedDate(newDate);
    const iso = newDate.toISOString().slice(0, 16);
    onChange(iso);
  };

  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));

  const displayText = selectedDate
    ? format(selectedDate, "PPP p", { locale: dateLocale })
    : "";

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground transition-all hover:bg-white/[0.06] focus-visible:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        <span className={cn("flex-1 truncate text-left", !displayText && "text-muted-foreground/30")}>
          {displayText || "—"}
        </span>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50"
        >
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-[20px] p-4 shadow-2xl w-[320px]">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/60 hover:bg-white/10 hover:text-foreground transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {format(viewDate, "MMMM yyyy", { locale: dateLocale })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/60 hover:bg-white/10 hover:text-foreground transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((wd) => (
                <div
                  key={wd}
                  className="flex items-center justify-center h-8 text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "relative flex items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-all",
                      !isCurrentMonth && "text-muted-foreground/20",
                      isSelected
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        : isTodayDay
                          ? "border border-indigo-500/30 text-indigo-300 hover:bg-white/10"
                          : "text-foreground hover:bg-white/10"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="mt-4 mb-3 h-px bg-white/5" />

            {/* Time selection */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                  HH
                </label>
                <div className="relative">
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(Number(e.target.value));
                      handleTimeChange();
                    }}
                    className="appearance-none w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <span className="mt-6 text-lg font-bold text-muted-foreground/30">:</span>

              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                  MM
                </label>
                <div className="relative">
                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      setSelectedMinute(Number(e.target.value));
                      handleTimeChange();
                    }}
                    className="appearance-none w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 text-muted-foreground/40", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
