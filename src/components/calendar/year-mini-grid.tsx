"use client";

import { format, startOfMonth, endOfMonth, isSameMonth, isToday, addDays } from "date-fns";
import { startOfWeek as dfnStartOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";

interface YearMiniGridProps {
  yearMonths: Date[];
  weekdays: string[];
  months: string[];
  effectiveFilteredPosts: Post[];
  getPostDisplayDate: (post: Post) => string | null;
  postsByDay: Map<string, Post[]>;
  onDayClick: (day: Date) => void;
}

export function YearMiniGrid({
  yearMonths,
  weekdays,
  months,
  effectiveFilteredPosts,
  getPostDisplayDate,
  postsByDay,
  onDayClick,
}: YearMiniGridProps) {
  return (
    <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden p-4">
      <div className="grid grid-cols-3 gap-3">
        {yearMonths.map((m, mIdx) => {
          const mStart = startOfMonth(m);
          const mEnd = endOfMonth(m);
          const mGridStart = dfnStartOfWeek(mStart, { weekStartsOn: 1 });
          const mGridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
          const mDays: Date[] = [];
          let d = mGridStart;
          while (d <= mGridEnd) {
            mDays.push(d);
            d = addDays(d, 1);
          }
          // Count posts in this month
          const postsInMonth = effectiveFilteredPosts.filter((p) => {
            const dd = getPostDisplayDate(p);
            if (!dd) return false;
            const dt = new Date(dd);
            return dt.getFullYear() === m.getFullYear() && dt.getMonth() === m.getMonth();
          });
          return (
            <div
              key={mIdx}
              className="rounded-[14px] border border-black/[0.06] dark:border-white/[0.05] bg-white/40 dark:bg-white/[0.02] p-3 transition-all hover:bg-white/60 dark:hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold tracking-tight">
                  {months[m.getMonth()]}
                </span>
                {postsInMonth.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/60 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                    {postsInMonth.length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {weekdays.map((wd, i) => (
                  <div key={i} className="flex h-4 items-center justify-center text-[8px] font-medium text-muted-foreground/40">
                    {wd.slice(0, 1)}
                  </div>
                ))}
                {mDays.map((day, dayIdx) => {
                  const inMonth = isSameMonth(day, m);
                  const today = isToday(day);
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayPosts = postsByDay.get(dayKey) ?? [];
                  const hasPosts = dayPosts.length > 0;
                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      onClick={() => onDayClick(day)}
                      className={cn(
                        "relative flex h-5 w-full items-center justify-center rounded text-[9px] transition-all",
                        !inMonth && "text-transparent",
                        inMonth && !today && !hasPosts && "text-foreground/70 hover:bg-white/70 dark:hover:bg-white/[0.06]",
                        today && "bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold",
                        hasPosts && !today && "font-semibold text-foreground"
                      )}
                    >
                      {format(day, "d")}
                      {hasPosts && (
                        <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 flex h-[3px] w-[3px]">
                          <span className="h-[3px] w-[3px] rounded-full bg-indigo-500 dark:bg-indigo-400" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
