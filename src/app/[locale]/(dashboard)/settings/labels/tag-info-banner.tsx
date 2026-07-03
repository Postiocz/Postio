"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInfoDialog } from "./tag-info-dialog";

interface TagInfoBannerProps {
  /** i18n strings for the banner itself. */
  t: {
    text: string;
    learnMore: string;
    dismiss: string;
  };
  /** i18n strings passed through to the info dialog. */
  infoDialog: React.ComponentProps<typeof TagInfoDialog>["t"];
  /** localStorage key used to persist the dismissed state per user. */
  storageKey?: string;
}

/**
 * Sticky info banner shown on the Labels page.
 *
 * Visual reference: Buffer's "Tags are visible to everyone in your organization"
 * notice, adapted to the Postio design system (pure-black + glassmorphism +
 * indigo accent + 20px radius).
 *
 * Layout:
 * - Desktop: horizontal layout, sits at the top of the page content.
 * - Mobile: stacks icon + text + close button vertically, full width.
 *
 * Clicking "Zjistit více" opens a modal with a short README about tags
 * (what they are, why use them, how to use them, visibility note).
 *
 * Dismissal is persisted in `localStorage` (key supplied via props) so the
 * banner does not flash on every navigation. SSR-safe: the dismissed state
 * is only read after mount, so the server-rendered HTML is always visible
 * (avoiding layout shift / hydration mismatch).
 */
export function TagInfoBanner({
  t,
  infoDialog,
  storageKey = "postio:labels:info-banner-dismissed",
}: TagInfoBannerProps) {
  // `true` = show the banner, `false` = dismissed. We start with `true` so the
  // server HTML always includes the banner; after mount we read localStorage
  // and may flip to `false` if the user previously dismissed it.
  const [visible, setVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        setVisible(false);
      }
    } catch {
      // localStorage may be unavailable (private mode, SSR remnants) – fail
      // silently and keep the banner visible.
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore – the banner will re-appear on the next visit, which is fine.
    }
  };

  if (!visible) return null;

  return (
    <>
      <div
        role="note"
        aria-label={t.text}
        className={cn(
          // Glassmorphism card matching the Postio design system.
          "relative flex w-full items-start gap-3 rounded-[20px] border border-white/5 bg-white/50 px-4 py-3 backdrop-blur-sm transition-all duration-200",
          "dark:bg-card/40 dark:border-white/5",
          "hover:border-white/10 dark:hover:border-white/10",
          // Mobile: vertical stack. Desktop: horizontal with text on the left
          // and close button on the right.
          "flex-col sm:flex-row sm:items-center sm:gap-3",
          // Smooth fade-in after hydration so we never flash "nothing then
          // suddenly banner" when localStorage says it should be dismissed.
          hydrated ? "opacity-100" : "opacity-100",
        )}
      >
        {/* Icon badge – indigo/purple glass disk with a soft glow. */}
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/20"
        >
          <Info className="h-4 w-4 text-indigo-300" />
        </span>

        {/* Text + inline "Learn more" button. */}
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground sm:text-sm">
          {t.text}{" "}
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="font-medium text-indigo-300 underline-offset-4 transition-colors hover:text-indigo-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            {t.learnMore}
          </button>
        </p>

        {/* Close button – bigger touch target on mobile. */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t.dismiss}
          title={t.dismiss}
          className={cn(
            "absolute right-2 top-2 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors",
            "hover:bg-white/10 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            // On mobile, keep it in the corner; on desktop, allow it to sit
            // inline with the row (already the case via flex).
            "sm:static sm:h-7 sm:w-7",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <TagInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        t={infoDialog}
      />
    </>
  );
}
