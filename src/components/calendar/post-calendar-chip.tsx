import React from "react";
import { Calendar as CalendarIcon, Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Instagram, Facebook, Twitter, Linkedin, Youtube, TikTok } from "@/components/ui/social-icons";
import type { Post, PostPlatform } from "@/types/calendar";

/** Mapa platform ID → Lucide ikona. Single source of truth pro kalendář. */
export const PlatformIconMap: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

/** Status-based color classes pro celý chip (pozadí, text, border). */
export const STATUS_STYLES: Record<string, string> = {
  published:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/20",
  scheduled:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/20",
  publishing:
    "bg-blue-50 text-blue-700 border-blue-200 animate-pulse dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/20",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/20",
  draft:
    "bg-gray-50 text-muted-foreground border-gray-200 opacity-70 dark:bg-white/[0.02] dark:text-muted-foreground/50 dark:border-white/5 dark:opacity-60",
  removed_externally:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/20",
  archived:
    "bg-gray-100 text-gray-500 border-gray-300 opacity-50 dark:bg-white/5 dark:text-gray-500 dark:border-white/5 dark:opacity-40",
};

export const FALLBACK_STATUS =
  "bg-gray-50 text-muted-foreground border-gray-200 dark:bg-white/5 dark:text-muted-foreground dark:border-white/5";

/** Status-based barvy pro jednotlivé platform ikony. */
export function getPlatformIconColor(platformStatus: string): string {
  if (platformStatus === "published") return "text-emerald-600 dark:text-emerald-400";
  if (platformStatus === "failed") return "text-red-600 dark:text-red-400";
  if (platformStatus === "scheduled") return "text-indigo-500 dark:text-indigo-400";
  return "text-muted-foreground";
}

/**
 * Vrátí Tailwind třídy pro status-based styling chipu.
 * Single source of truth — řeší #16 (unifikace Week view).
 */
export function getChipStatusStyles(status: string): string {
  return STATUS_STYLES[status] ?? FALLBACK_STATUS;
}

/* ------------------------------------------------------------------ */
/* Platform Icons Group                                               */
/* ------------------------------------------------------------------ */

export interface PlatformIconsGroupProps {
  platforms: PostPlatform[];
  /** Velikost: xs=h-3, sm=h-3.5, md=h-4 */
  size?: "xs" | "sm" | "md";
  /** Zobrazit check/X badge u published/failed platforem */
  showBadges?: boolean;
}

/**
 * Renderuje skupinu platform ikon se status barvami a volitelnými badgey.
 * Sdílený helper pro všechny kalendářové pohledy.
 */
export function PlatformIconsGroup({ platforms, size = "xs", showBadges = false }: PlatformIconsGroupProps) {
  const iconSizeClass = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const wrapperSize = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const badgeSize = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <div className="flex -space-x-1 shrink-0">
      {platforms.map((p, idx) => {
        const Icon = PlatformIconMap[p.platform] || CalendarIcon;
        return (
          <div key={idx} className={cn("relative flex items-center justify-center", wrapperSize)}>
            <Icon className={cn(iconSizeClass, getPlatformIconColor(p.status))} />
            {showBadges && p.status === "published" && (
              <div className={cn("absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-emerald-500", badgeSize)}>
                <Check className="h-1.5 w-1.5 text-white" strokeWidth={4} />
              </div>
            )}
            {showBadges && p.status === "failed" && (
              <div className={cn("absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-red-500", badgeSize)}>
                <X className="h-1.5 w-1.5 text-white" strokeWidth={4} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PostCalendarChip (kompletní čip pro Month/Week/Mobile)             */
/* ------------------------------------------------------------------ */

export interface PostCalendarChipProps {
  post: Post;
  /** Velikost ikony platformy: xs=h-3, sm=h-3.5, md=h-4 */
  iconSize?: "xs" | "sm" | "md";
  /** Maximální délka truncovaného obsahu */
  contentLength?: number;
  /** Zobrazit čas */
  showTime?: boolean;
  /** Časový řetězec (formát HH:MM) */
  time?: string;
  /** Zobrazit check/X badge na platform ikonách */
  showPlatformBadges?: boolean;
  /** Třída pro wrapper element */
  className?: string;
  /** Kliknutí na celý chip */
  onClick?: (e: React.MouseEvent) => void;
  /** Hover enter (pro Month/Week preview) */
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  /** Ref na wrapper element */
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Univerzální komponenta pro zobrazení jednoho postu v kalendářových pohledech.
 * Použita v Month view, Week view a Mobile Agenda.
 *
 * Status styling zahrnuje všech 6+1 stavů (řeší #16):
 * published, scheduled, publishing, failed, draft, removed_externally, fallback.
 */
export function PostCalendarChip({
  post,
  iconSize = "xs",
  contentLength = 20,
  showTime = true,
  time = "",
  showPlatformBadges = false,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ref,
}: PostCalendarChipProps) {
  const platformsToRender: PostPlatform[] = post.post_platforms || [];

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-all hover:scale-[1.02] cursor-pointer border",
        getChipStatusStyles(post.status),
        className
      )}
      title={post.content?.substring(0, 60)}
    >
      <PlatformIconsGroup platforms={platformsToRender} size={iconSize} showBadges={showPlatformBadges} />

      {showTime && time && (
        <span className="flex-shrink-0 ml-0.5">{time}</span>
      )}

      <span className="truncate">
        {post.content?.substring(0, contentLength)}
      </span>

      {post.status === "archived" && (
        <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
      )}
    </div>
  );
}
