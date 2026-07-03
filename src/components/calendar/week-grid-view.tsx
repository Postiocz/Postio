"use client";

import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";
import { PostCalendarChip } from "./post-calendar-chip";

interface WeekGridViewProps {
  days: Date[];
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

export function WeekGridView({
  days,
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
}: WeekGridViewProps) {
  return (
    <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-black/[0.08] dark:border-white/[0.06]">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className="border-r border-black/[0.08] dark:border-white/[0.06] last:border-r-0 px-2 py-3 text-center text-xs font-medium text-muted-foreground/60"
          >
            {day}
          </div>
        ))}
      </div>
      {/* 7 days of current week */}
      <div className="grid grid-cols-7">
        {days.map((day, dayIndex) => {
          const dayPosts = getPostsForDayEffective(day);
          const today = isToday(day);
          return (
            <div
              key={dayIndex}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative min-h-[180px] border-r border-b border-black/[0.08] dark:border-white/[0.06] p-2 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                today && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20",
                dayIndex % 7 === 6 && "border-r-0"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    today
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 6).map((post) => {
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
                      contentLength={16}
                      time={time}
                      onClick={(e) => handlePostClick(post, e)}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLDivElement;
                        handlePostHover(post, target);
                      }}
                      onMouseLeave={handlePostLeave}
                    />
                  );
                })}
                {dayPosts.length > 6 && (
                  <div className="text-[10px] text-muted-foreground/50 pl-1">
                    +{dayPosts.length - 6} {locale === "cs" ? "další" : locale === "uk" ? "більше" : "more"}
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
