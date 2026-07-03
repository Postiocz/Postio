"use client";

import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/calendar";
import { PlatformIconsGroup, getChipStatusStyles } from "./post-calendar-chip";

interface AgendaDay {
  day: Date;
  posts: Post[];
}

interface AgendaListViewProps {
  agendaDays: AgendaDay[];
  locale: string;
  noPostsLabel?: string;
  getPostDisplayDate: (post: Post) => string | null;
  formatTime: (isoString: string) => string;
  handlePostClick: (post: Post, e: React.MouseEvent) => void;
}

export function AgendaListView({
  agendaDays,
  locale,
  noPostsLabel,
  getPostDisplayDate,
  formatTime,
  handlePostClick,
}: AgendaListViewProps) {
  return (
    <div className="hidden lg:flex flex-col rounded-[20px] border border-black/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-card/40 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
      <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.05] overflow-y-auto max-h-[calc(100vh-360px)]">
        {agendaDays.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground/60">
            {noPostsLabel ?? "No posts in this range"}
          </div>
        )}
        {agendaDays.map(({ day, posts }) => (
          <div key={format(day, "yyyy-MM-dd")} className="flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-white/90 dark:bg-card/95 backdrop-blur-md z-10">
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isToday(day)
                    ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                    : "bg-white/[0.03] text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {formatAgendaDate(day, locale)}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {posts.length}{" "}
                  {getPostCountLabel(posts.length, locale)}
                </span>
              </div>
            </div>
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
                      "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:scale-[1.005]",
                      getChipStatusStyles(post.status)
                    )}
                  >
                    <PlatformIconsGroup platforms={platformsToRender} size="md" />
                    {time && (
                      <span className="text-xs text-muted-foreground/70 shrink-0 font-mono">
                        {time}
                      </span>
                    )}
                    <p className="text-xs text-foreground/80 truncate flex-1">
                      {post.content?.substring(0, 100)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAgendaDate(day: Date, locale: string): string {
  if (locale === "cs") {
    return day.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  return day.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
