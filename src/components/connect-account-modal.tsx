"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, BarChart3, AlertTriangle, ExternalLink, X } from "lucide-react";
import type { ComponentType } from "react";

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  PlatformIcon: ComponentType<{ className?: string }>;
  onConnect: () => void | Promise<void>;
  t: {
    title: string;
    autoPublishing: string;
    analytics: string;
    aiAssistant: string;
    warningTitle: string;
    warningDesc: string;
    connectButton: string;
    learnMore: string;
  };
}

export function ConnectAccountModal({
  open,
  onOpenChange,
  platformName,
  PlatformIcon,
  onConnect,
  t,
}: ConnectAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">
          {t.title.replace("[platform]", platformName)}
        </DialogTitle>
        {/* Radix UI requires either a `DialogDescription` child or an
            explicit `aria-describedby` on `DialogContent`. Without it the
            dev console prints a warning and screen readers lose important
            context. We keep the description visually hidden (sr-only) but
            expose the platform name and key permissions to assistive tech
            so the dialog is fully accessible. The visible body still
            contains the same info as the existing feature list + warning
            banner – this hidden copy is purely for a11y. */}
        <DialogDescription className="sr-only">
          {t.title.replace("[platform]", platformName)} – {t.warningDesc}
        </DialogDescription>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          {/* Header with platform logo */}
          <div className="px-6 pt-6 pb-4 text-center sm:px-8 sm:pt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 mb-4">
              <PlatformIcon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {t.title.replace("[platform]", platformName)}
            </h2>
          </div>

          {/* Features list */}
          <div className="px-6 sm:px-8 pb-4">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {t.autoPublishing}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {t.analytics}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {t.aiAssistant}
                </p>
              </li>
            </ul>
          </div>

          {/* Warning notice */}
          <div className="px-6 sm:px-8 pb-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300/90">
                  {t.warningTitle}
                </p>
                <p className="text-xs text-amber-300/60 mt-1 leading-relaxed">
                  {t.warningDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Main action button */}
          <div className="px-6 sm:px-8 pb-4">
            <Button
              onClick={onConnect}
              className="w-full py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all"
            >
              {t.connectButton}
            </Button>
          </div>

          {/* Learn more link */}
          <div className="px-6 sm:px-8 pb-6 text-center">
            <a
              href="https://www.facebook.com/business/help/193027849380904"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-muted-foreground/90 transition-colors"
            >
              {t.learnMore}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
