"use client";

import { useState } from "react";
import { format, isToday, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight as ChevronRightIcon, Grid3x3, List } from "lucide-react";
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
  // Month grid props (#7 — mobile view switcher)
  calendarDays: Date[];
  getPostsForDayEffective: (day: Date) => Post[];
  tMobileView?: {
    month: string;
    agenda: string;
  };
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
  calendarDays,
  getPostsForDayEffective,
  tMobileView,
}: MobileAgendaViewProps) {
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  // #7 — Mobile view switcher: default to "agenda", toggle between "month" and "agenda"
  const [mobileView, setMobileView] = useState<"month" | "agenda">("agenda");

  const monthLabel = tMobileView?.month ?? "Month";
  const agendaLabel = tMobileView?.agenda ?? "Agenda";

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
        <div className="flex flex-col items-center gap-1.5">
          <h2 className="text-base font-semibold tracking-tight">
            {months[monthIndex]} {year}
          </h2>
          {/* #7 — Simplified ViewSwitcher for mobile (Month + Agenda only) */}
          <div
            className="inline-flex items-center rounded-[14px] border border-black/[0.08] bg-white/70 p-0.5 backdrop-blur-md dark:border-white/[0.06] dark:bg-card/40"
            role="tablist"
          >
            {([
              { id: "month" as const, label: monthLabel, icon: Grid3x3 },
              { id: "agenda" as const, label: agendaLabel, icon: List },
            ]).map((v) => {
              const Icon = v.icon;
              const isActive = v.id === mobileView;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setMobileView(v.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-[11px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                      : "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          onClick={nextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-muted-foreground transition-all hover:bg-gray-100 hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* #7 — Mobile Month Grid (when mobileView === "month") */}
      {mobileView === "month" ? (
        <MobileMonthGrid
          days={calendarDays}
          currentDate={currentDate}
          weekdays={weekdays}
          locale={locale}
          getPostsForDayEffective={getPostsForDayEffective}
          handleDayClick={handleDayClick}
          handlePostClick={handlePostClick}
          getPostDisplayDate={getPostDisplayDate}
          formatTime={formatTime}
        />
      ) : (
        /* Mobile Agenda – All days of current month */
        <div className="flex flex-col divide-y divide-gray-200 dark:divide-white/5 overflow-y-auto max-h-[calc(100vh-320px)]">
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
      )}
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

/* ------------------------------------------------------------------ */
/* Mobile Month Grid — compact version of desktop MonthGridView       */
/* Smaller cells, max 2 posts per day, no hover preview               */
/* ------------------------------------------------------------------ */

interface MobileMonthGridProps {
  days: Date[];
  currentDate: Date;
  weekdays: string[];
  locale: string;
  getPostsForDayEffective: (day: Date) => Post[];
  handleDayClick: (day: Date) => void;
  handlePostClick: (post: Post, e: React.MouseEvent) => void;
  getPostDisplayDate: (post: Post) => string | null;
  formatTime: (isoString: string) => string;
}

function MobileMonthGrid({
  days,
  currentDate,
  weekdays,
  locale,
  getPostsForDayEffective,
  handleDayClick,
  handlePostClick,
  getPostDisplayDate,
  formatTime,
}: MobileMonthGridProps) {
  return (
    <div className="overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-black/[0.08] dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className="border-r border-black/[0.08] dark:border-white/[0.06] last:border-r-0 px-1 py-2 text-center text-[10px] font-medium text-muted-foreground/60"
          >
            {day.slice(0, 2)}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, dayIndex) => {
          const dayPosts = getPostsForDayEffective(day);
          const inCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={dayIndex}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative min-h-[64px] border-r border-b border-black/[0.08] dark:border-white/[0.06] p-1 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                !inCurrentMonth && "bg-gray-100/50 dark:bg-transparent",
                today && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20",
                dayIndex % 7 === 6 && "border-r-0"
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                    today
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                      : inCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/30"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Posts in this day — max 2 on mobile */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 2).map((post) => {
                  const platformsToRender = post.post_platforms || [];
                  const displayDate = getPostDisplayDate(post);
                  const time = displayDate ? formatTime(displayDate) : "";

                  return (
                    <button
                      key={post.id}
                      onClick={(e) => handlePostClick(post, e)}
                      className={cn(
                        "w-full flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] transition-all active:scale-[0.97] border",
                        getChipStatusStyles(post.status)
                      )}
                    >
                      <PlatformIconsGroup platforms={platformsToRender} size="xs" />
                      <span className="truncate flex-1 text-left">
                        {post.content?.substring(0, 15)}
                      </span>
                      {time && (
                        <span className="flex-shrink-0 text-[8px] opacity-60 ml-0.5">{time}</span>
                      )}
                    </button>
                  );
                })}
                {dayPosts.length > 2 && (
                  <div className="text-[9px] text-muted-foreground/50 pl-0.5">
                    +{dayPosts.length - 2}{" "}
                    {locale === "cs" ? "další" : locale === "uk" ? "більше" : "more"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
