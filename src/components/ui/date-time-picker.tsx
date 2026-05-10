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

  React.useEffect(() => {
    if (!value) {
      setSelectedDate(null);
      setSelectedHour(12);
      setSelectedMinute(0);
      return;
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;

    setSelectedDate(d);
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes());
    setViewDate(d);
  }, [value]);

  const monthStart = startOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (isSameDay(day, calendarEnd) || day < calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const applyTime = (base: Date, hour: number, minute: number) => {
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);
    return next;
  };

  const emitChange = (d: Date) => {
    setSelectedDate(d);
    onChange(d.toISOString());
  };

  const handleDayClick = (d: Date) => {
    emitChange(applyTime(d, selectedHour, selectedMinute));
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    const base = selectedDate || new Date();
    emitChange(applyTime(base, hour, selectedMinute));
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    const base = selectedDate || new Date();
    emitChange(applyTime(base, selectedHour, minute));
  };

  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));

  const displayText = selectedDate
    ? format(selectedDate, "PPP p", { locale: dateLocale })
    : "";

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-xl border px-4 text-sm text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 bg-white/50 dark:bg-white/[0.03] border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/[0.06] focus-visible:border-indigo-500/30 dark:focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20",
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
          <div className="bg-white/95 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[20px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl w-[320px] text-slate-900 dark:text-white">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {format(viewDate, "MMMM yyyy", { locale: dateLocale })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-all"
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
                          ? "border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:bg-black/5 dark:hover:bg-white/10"
                          : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="mt-4 mb-3 h-px bg-black/5 dark:bg-white/5" />

            {/* Time selection */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  HH
                </label>
                <TimeSelect
                  value={selectedHour}
                  options={hours}
                  format={(v) => String(v).padStart(2, "0")}
                  onChange={handleHourChange}
                />
              </div>

              <span className="mt-6 text-lg font-bold text-muted-foreground/30">:</span>

              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  MM
                </label>
                <TimeSelect
                  value={selectedMinute}
                  options={minutes}
                  format={(v) => String(v).padStart(2, "0")}
                  onChange={handleMinuteChange}
                />
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

type TimeSelectProps = {
  value: number;
  options: number[];
  format: (v: number) => string;
  onChange: (v: number) => void;
};

function TimeSelect({ value, options, format, onChange }: TimeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        type="button"
        className="flex items-center justify-between w-full h-10 rounded-lg border px-3 text-sm text-foreground transition-all cursor-pointer bg-white/60 dark:bg-[#09090b] border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-white/[0.06] focus:border-indigo-500/30 dark:focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <span>{format(value)}</span>
        <ChevronIcon />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-[60]"
        >
          <div className="w-32 bg-white/95 dark:bg-[#0b0b0b] backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl overflow-hidden text-slate-900 dark:text-white">
            <div
              ref={listRef}
              className="max-h-52 overflow-y-auto py-1"
              role="listbox"
              aria-orientation="vertical"
            >
              {options.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-active={isSelected}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center w-full px-3 py-2 text-sm text-left transition-all",
                      isSelected
                        ? "bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-medium"
                        : "text-foreground hover:bg-black/5 dark:hover:bg-white/[0.06]"
                    )}
                  >
                    {format(opt)}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
