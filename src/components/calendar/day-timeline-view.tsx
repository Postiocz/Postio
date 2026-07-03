"use client";

import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";
import { CurrentTimeIndicator } from "./current-time-indicator";
import { PlatformIconsGroup, getChipStatusStyles } from "./post-calendar-chip";

interface DayTimelineViewProps {
  currentDate: Date;
  locale: string;
  dayPosts: Post[];
  getPostDisplayDate: (post: Post) => string | null;
  formatTime: (isoString: string) => string;
  handlePostClick: (post: Post, e: React.MouseEvent) => void;
  currentTimeLabel?: string;
}

export function DayTimelineView({
  currentDate,
  locale,
  dayPosts,
  getPostDisplayDate,
  formatTime,
  handlePostClick,
  currentTimeLabel,
}: DayTimelineViewProps) {
  const HOUR_HEIGHT = 60;
  const sortedDayPosts = [...dayPosts].sort((a, b) => {
    const da = getPostDisplayDate(a);
    const db = getPostDisplayDate(b);
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da).getTime() - new Date(db).getTime();
  });

  return (
    <div className="hidden lg:block rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
      {/* Day Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.06]">
        <div>
          <div className="text-sm font-semibold tracking-tight">
            {format(currentDate, "EEEE", { locale: locale === "cs" ? cs : undefined })}
          </div>
          <div className="text-xs text-muted-foreground/60">
            {format(currentDate, "d. MMMM yyyy", { locale: locale === "cs" ? cs : undefined })}
          </div>
        </div>
        <div className="text-xs text-muted-foreground/60">
          {dayPosts.length}{" "}
          {locale === "cs"
            ? (dayPosts.length === 1 ? "příspěvek" : dayPosts.length < 5 ? "příspěvky" : "příspěvků")
            : locale === "uk"
            ? (dayPosts.length === 1 ? "публікація" : dayPosts.length < 5 ? "публікації" : "публікацій")
            : (dayPosts.length === 1 ? "post" : "posts")}
        </div>
      </div>

      {/* 24h timeline + absolutely positioned posts */}
      <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
        <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour lines + labels */}
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-black/[0.04] dark:border-white/[0.04]"
              style={{ top: `${h * HOUR_HEIGHT}px` }}
            >
              <span className="absolute -top-2 left-2 bg-white/90 dark:bg-card/90 px-1 text-[10px] text-muted-foreground/50 rounded">
                {h.toString().padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {/* Current Time Indicator */}
          <CurrentTimeIndicator hourHeight={HOUR_HEIGHT} label={currentTimeLabel ?? "Current time"} />

          {/* Posts — absolutely positioned by time */}
          {sortedDayPosts.map((post) => {
            const displayDate = getPostDisplayDate(post);
            if (!displayDate) return null;
            const d = new Date(displayDate);
            const top = (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT;
            const platformsToRender = post.post_platforms || [];
            return (
              <button
                key={post.id}
                onClick={() => handlePostClick(post, { stopPropagation: () => {} } as React.MouseEvent)}
                className={cn(
                  "absolute left-16 right-4 rounded-lg border px-3 py-1.5 text-left transition-all hover:scale-[1.01]",
                  getChipStatusStyles(post.status)
                )}
                style={{ top: `${top}px`, minHeight: "32px" }}
              >
                <div className="flex items-center gap-2">
                  <PlatformIconsGroup platforms={platformsToRender} size="sm" />
                  <span className="text-[10px] font-semibold text-muted-foreground/70 shrink-0">
                    {formatTime(displayDate)}
                  </span>
                  <span className="text-xs truncate text-foreground/90">
                    {post.content?.substring(0, 60)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
