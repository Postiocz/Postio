"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Tag as TagIcon,
  Sparkles,
  Filter,
  EyeOff,
  ArrowRight,
} from "lucide-react";

interface TagInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** i18n strings – keeps the dialog decoupled from next-intl usage. */
  t: {
    title: string;
    intro: string;
    whatTitle: string;
    whatBody: string;
    whyTitle: string;
    whyItems: string[];
    howTitle: string;
    howItems: string[];
    visibilityTitle: string;
    visibilityBody: string;
    close: string;
  };
}

interface InfoItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

/**
 * Modal window with a short README about tags. Opened from the info banner
 * when the user clicks "Zjistit více". Layout: 4 sections (What / Why / How /
 * Visibility), each with an icon + heading + body, styled in the Postio
 * design system (glassmorphism, 20px radius, indigo accent).
 */
export function TagInfoDialog({ open, onOpenChange, t }: TagInfoDialogProps) {
  const whyItems: InfoItem[] = t.whyItems.map((text) => ({
    icon: Sparkles,
    text,
  }));
  const howItems: InfoItem[] = t.howItems.map((text) => ({
    icon: ArrowRight,
    text,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg p-0 overflow-hidden"
      >
        {/* Header with indigo gradient background matching the info banner. */}
        <div className="relative border-b border-white/5 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-inset ring-indigo-500/30"
            >
              <Lightbulb className="h-5 w-5 text-indigo-300" />
            </span>
            <div>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl text-foreground">
                  {t.title}
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t.intro}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body – 4 sections, scrollable on small screens. */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-5">
          {/* What are tags */}
          <section className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-inset ring-white/10"
            >
              <TagIcon className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t.whatTitle}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t.whatBody}
              </p>
            </div>
          </section>

          {/* Why use them */}
          <section className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20"
            >
              <Sparkles className="h-4 w-4 text-indigo-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t.whyTitle}
              </h3>
              <ul className="mt-2 space-y-2">
                {whyItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400/70"
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* How to use them */}
          <section className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20"
            >
              <Filter className="h-4 w-4 text-indigo-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t.howTitle}
              </h3>
              <ol className="mt-2 space-y-2">
                {howItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-medium text-indigo-300 ring-1 ring-inset ring-white/10">
                      {idx + 1}
                    </span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Visibility warning */}
          <section className="flex gap-3 rounded-[16px] border border-amber-500/20 bg-amber-500/5 p-3.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-inset ring-amber-500/20"
            >
              <EyeOff className="h-4 w-4 text-amber-300" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-100/90">
                {t.visibilityTitle}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-amber-200/70">
                {t.visibilityBody}
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4 sm:px-8">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-[20px]"
          >
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
