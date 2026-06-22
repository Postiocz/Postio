"use client";

import { CheckCircle2, CalendarClock, AlertTriangle, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostForStats {
  status: string;
  post_platforms?: { status: string }[];
}

interface StatsCardsProps {
  posts: PostForStats[];
  t: {
    totalPublished: string;
    totalScheduled: string;
    failedPosts: string;
    drafts: string;
    thisMonth: string;
  };
}

/**
 * Pure prezentacni komponenta – 4 statisticke karty nad kalendarem.
 *
 * Pocita pocty primo z `posts` (single source of truth = stranka server komponent).
 * Saha na `post.status`, ktery `calendar/page.tsx` pocita z `post_platforms.status`
 * (failed > publishing > removed_externally > published > scheduled > draft).
 *
 * Glassmorphism styl (Pure Black #000, radius 20px, backdrop-blur) konzistentni
 * se zbytkem Postio kalendare.
 */
export function StatsCards({ posts, t }: StatsCardsProps) {
  // Pocitame z `post.status`, ktery je agregovan na strane serveru v page.tsx.
  // Nepocitame z post_platforms, abychom nezdvojovali "1 prispevek na 3 site = 3".
  const published = posts.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const failed = posts.filter((p) => p.status === "failed").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  const cards = [
    {
      key: "published",
      label: t.totalPublished,
      value: published,
      // emerald (zelena) = uspech, konzistentni s PostCard badge barvou
      icon: CheckCircle2,
      ringClass: "from-emerald-500/30 to-emerald-500/0",
      iconClass: "text-emerald-600 dark:text-emerald-400",
      chipClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    {
      key: "scheduled",
      label: t.totalScheduled,
      value: scheduled,
      // indigo = naplanovano, konzistentni s indikatory v cele app
      icon: CalendarClock,
      ringClass: "from-indigo-500/30 to-indigo-500/0",
      iconClass: "text-indigo-600 dark:text-indigo-400",
      chipClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    },
    {
      key: "failed",
      label: t.failedPosts,
      value: failed,
      // red = chyba / neuspech
      icon: AlertTriangle,
      ringClass: "from-red-500/30 to-red-500/0",
      iconClass: "text-red-600 dark:text-red-400",
      chipClass: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    },
    {
      key: "drafts",
      label: t.drafts,
      value: drafts,
      // gray/slate = neutrlani, koncepty
      icon: FileEdit,
      ringClass: "from-slate-500/30 to-slate-500/0",
      iconClass: "text-slate-600 dark:text-slate-400",
      chipClass:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={cn(
              "relative overflow-hidden rounded-[20px] border border-black/[0.08] bg-white/70 p-4 backdrop-blur-md",
              "dark:border-white/[0.06] dark:bg-card/40",
              "shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl",
              "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
            )}
          >
            {/* Jemny barevny glow v pozadi – Postio design system */}
            <div
              className={cn(
                "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl",
                card.ringClass
              )}
            />

            <div className="relative flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-[14px] border",
                  card.chipClass
                )}
              >
                <Icon className={cn("h-5 w-5", card.iconClass)} />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                {t.thisMonth}
              </span>
            </div>

            <div className="relative mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {card.value}
              </span>
              <span className="text-xs text-muted-foreground/60">{card.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
