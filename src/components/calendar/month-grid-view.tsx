"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { format, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";
import { PostCalendarChip } from "./post-calendar-chip";

interface MonthGridViewProps {
  days: Date[];
  currentDate: Date;
  weekdays: string[];
  locale: string;
  getPostsForDayEffective: (day: Date) => Post[];
  getPostDisplayDate: (post: Post) => string | null;
  formatTime: (isoString: string) => string;
  postCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  handleDayClick: (day: Date) => void;
  handlePostClick: (post: Post, e: React.MouseEvent) => void;
  handlePostHover: (post: Post, element: HTMLDivElement) => void;
  handlePostLeave: () => void;
}

export function MonthGridView({
  days,
  currentDate,
  weekdays,
  locale,
  getPostsForDayEffective,
  getPostDisplayDate,
  formatTime,
  postCardRefs,
  handleDayClick,
  handlePostClick,
  handlePostHover,
  handlePostLeave,
}: MonthGridViewProps) {
  // ARIA: index fokusední buňky — default = dnešek
  const todayIndex = useMemo(() => days.findIndex((d) => isToday(d)), [days]);
  const [focusedIndex, setFocusedIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Při změně měsíce reset na dnešek (nebo 0)
  useEffect(() => {
    setFocusedIndex(todayIndex >= 0 ? todayIndex : 0);
  }, [currentDate, todayIndex]);

  const cols = 7;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next = focusedIndex;

      switch (e.key) {
        case "ArrowRight":
          next = focusedIndex + 1;
          break;
        case "ArrowLeft":
          next = focusedIndex - 1;
          break;
        case "ArrowDown":
          next = focusedIndex + cols;
          break;
        case "ArrowUp":
          next = focusedIndex - cols;
          break;
        case "Home":
          next = focusedIndex - (focusedIndex % cols);
          break;
        case "End":
          next = focusedIndex + (cols - 1 - (focusedIndex % cols));
          break;
        case "PageDown":
          next = focusedIndex + days.length;
          break;
        case "PageUp":
          next = focusedIndex - days.length;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleDayClick(days[focusedIndex]);
          return;
        default:
          return;
      }

      e.preventDefault();
      if (next >= 0 && next < days.length) {
        setFocusedIndex(next);
        // Auto-scroll do viditelnosti
        const targetCell = document.querySelector(
          `[data-day-index="${next}"]`
        ) as HTMLDivElement | null;
        targetCell?.focus({ preventScroll: true });
      }
    },
    [focusedIndex, days, cols, handleDayClick]
  );

  // Rozdělení do řádků pro role="row"
  const rows = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += cols) {
      result.push(days.slice(i, i + cols));
    }
    return result;
  }, [days]);

  return (
    <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-black/[0.08] dark:border-white/[0.06]" role="row">
        {weekdays.map((day, i) => (
          <div
            key={i}
            role="columnheader"
            aria-colindex={i + 1}
            className="border-r border-black/[0.08] dark:border-white/[0.06] last:border-r-0 px-2 py-3 text-center text-xs font-medium text-muted-foreground/60"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div role="grid" aria-label={locale === "cs" ? "Kalendář měsíce" : locale === "uk" ? "Календар місяця" : "Month calendar"}>
        {rows.map((rowDays, rowIndex) => (
          <div key={rowIndex} role="row" className="grid grid-cols-7">
            {rowDays.map((day, cellIndex) => {
              const dayIndex = rowIndex * cols + cellIndex;
              const dayPosts = getPostsForDayEffective(day);
              const inCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const isFocused = dayIndex === focusedIndex;

              return (
                <div
                  key={dayIndex}
                  data-day-index={dayIndex}
                  role="gridcell"
                  aria-label={`${format(day, "d")} ${format(day, "MMMM")}${dayPosts.length > 0 ? `, ${dayPosts.length} příspěvků` : ""}`}
                  aria-current={today ? "date" : undefined}
                  tabIndex={isFocused ? 0 : -1}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedIndex(dayIndex)}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative min-h-[90px] border-r border-b border-black/[0.08] dark:border-white/[0.06] p-2 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] outline-none",
                    isFocused && "!bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/40",
                    !inCurrentMonth && "bg-gray-100/50 dark:bg-transparent",
                    today && !isFocused && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20",
                    cellIndex === 6 && "border-r-0"
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        today
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                          : inCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/30"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Posts in this day */}
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => {
                      const displayDate = getPostDisplayDate(post);
                      const time = displayDate ? formatTime(displayDate) : "";

                      return (
                        <PostCalendarChip
                          key={post.id}
                          post={post}
                          ref={(el) => {
                            if (el) postCardRefs.current.set(post.id, el);
                          }}
                          iconSize="xs"
                          contentLength={20}
                          time={time}
                          showPlatformBadges
                          onClick={(e) => handlePostClick(post, e)}
                          onMouseEnter={(e) => {
                            const target = e.currentTarget as HTMLDivElement;
                            handlePostHover(post, target);
                          }}
                          onMouseLeave={handlePostLeave}
                        />
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground/50 pl-1">
                        +{dayPosts.length - 3} {locale === "cs" ? "další" : locale === "uk" ? "більше" : "more"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
