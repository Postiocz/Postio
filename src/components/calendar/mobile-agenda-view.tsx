"use client";

import { format, isToday } from "date-fns";
import { ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";
import { PlatformIconsGroup, getChipStatusStyles } from "./post-calendar-chip";

interface MobileAgendaDay {
  day: Date;
  posts: Post[];
}

interface MobileAgendaViewProps {
  currentDate: Date;
  months: string[];
  weekdays: string[];
  mobileAgendaDays: MobileAgendaDay[];
  locale: string;
  getPostDisplayDate: (post: Post) => string | null;
  formatTime: (isoString: string) => string;
  handleDayClick: (day: Date) => void;
  handlePostClick: (post: Post, e: React.MouseEvent) => void;
  previousMonth: () => void;
  nextMonth: () => void;
}

export function MobileAgendaView({
  currentDate,
  months,
  weekdays,
  mobileAgendaDays,
  locale,
  getPostDisplayDate,
  formatTime,
  handleDayClick,
  handlePostClick,
  previousMonth,
  nextMonth,
}: MobileAgendaViewProps) {
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  return (
    <div className="lg:hidden flex flex-col rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
      {/* Mobile Navigation – Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between w-full px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.06] bg-white/90 dark:bg-card/95 backdrop-blur-xl">
        <button
          onClick={previousMonth}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold tracking-tight">
          {months[monthIndex]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Agenda – All days of current month */}
      <div className="flex flex-col divide-y divide-gray-200 dark:divide-white/5 overflow-y-auto max-h-[calc(100vh-280px)]">
        {mobileAgendaDays.map(({ day, posts }) => {
          const todayFlag = isToday(day);
          const weekdayName = weekdays[day.getDay() === 0 ? 6 : day.getDay() - 1];

          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className="flex flex-col"
            >
              {/* Day Header */}
              <div
                onClick={() => handleDayClick(day)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    todayFlag
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "bg-white/[0.03] text-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {weekdayName}, {format(day, "d.")} {months[day.getMonth()]}
                  </span>
                  {posts.length > 0 ? (
                    <span className="text-xs text-muted-foreground/60">
                      {posts.length}{" "}
                      {getPostCountLabel(posts.length, locale)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">
                      {locale === "cs" ? "Žádné příspěvky" : locale === "uk" ? "Немає публікацій" : "No posts"}
                    </span>
                  )}
                </div>
                {posts.length > 0 ? (
                  <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground/40 flex items-center">+</span>
                )}
              </div>

              {/* Posts for this day */}
              {posts.length > 0 && (
                <div className="space-y-2 px-4 pb-3 pl-[52px]">
                  {posts.map((post) => {
                    const platformsToRender = post.post_platforms || [];
                    const displayDate = getPostDisplayDate(post);
                    const time = displayDate ? formatTime(displayDate) : "";

                    return (
                      <button
                        key={post.id}
                        onClick={(e) => handlePostClick(post, e)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]",
                          getChipStatusStyles(post.status)
                        )}
                      >
                        <PlatformIconsGroup platforms={platformsToRender} size="md" showBadges />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/80 truncate">
                            {post.content?.substring(0, 60)}
                          </p>
                          {time && (
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {time}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPostCountLabel(count: number, locale: string): string {
  if (locale === "cs") {
    return count === 1 ? "příspěvek" : count < 5 ? "příspěvky" : "příspěvků";
  }
  if (locale === "uk") {
    return count === 1 ? "публікація" : count < 5 ? "публікації" : "публікацій";
  }
  return count === 1 ? "post" : "posts";
}
