"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, BarChart3, AlertTriangle, ExternalLink, X, Loader2, Zap, Bell } from "lucide-react";
import type { ComponentType } from "react";

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  PlatformIcon: ComponentType<{ className?: string }>;
  onConnect: (publishingType: "direct" | "manual") => void | Promise<void>;
  // Instagram + Facebook allow connecting a Personal profile, which cannot
  // publish via API. When true, show the profile-type selector so the user
  // can pick between automatic (Professional) and manual (Personal) publishing.
  showProfileChoice?: boolean;
  t: {
    title: string;
    autoPublishing: string;
    analytics: string;
    aiAssistant: string;
    warningTitle: string;
    warningDesc: string;
    connectButton: string;
    learnMore: string;
    learnMoreUrl?: string;
    errorTitle?: string;
    profileChoiceTitle: string;
    profileChoiceDirectTitle: string;
    profileChoiceDirectDesc: string;
    profileChoiceManualTitle: string;
    profileChoiceManualDesc: string;
  };
}

export function ConnectAccountModal({
  open,
  onOpenChange,
  platformName,
  PlatformIcon,
  onConnect,
  showProfileChoice = false,
  t,
}: ConnectAccountModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (publishingType: "direct" | "manual") => {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      await onConnect(publishingType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo k chybě při připojování.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">
          {t.title.replace("[platform]", platformName)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t.title.replace("[platform]", platformName)} – {t.warningDesc}
        </DialogDescription>

        {/* Close button – uses DialogClose for proper Radix a11y */}
        <DialogClose asChild>
          <button
            className="absolute top-5 right-5 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

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

          {/* Error message */}
          {error && (
            <div className="px-6 sm:px-8 pb-4">
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {t.errorTitle || "Chyba"}
                  </p>
                  <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main action area */}
          {showProfileChoice ? (
            // Instagram + Facebook: let the user pick how they will publish.
            // "direct" = Professional account (auto-publish via API).
            // "manual" = Personal profile (prepare + reminder, no API publish).
            <div className="px-6 sm:px-8 pb-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
                {t.profileChoiceTitle}
              </p>
              {/* Direct (Professional) option */}
              <button
                type="button"
                onClick={() => handleConnect("direct")}
                disabled={connecting}
                className="group w-full flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-indigo-400/40 hover:bg-indigo-500/10 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="flex-shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-white/10">
                  <Zap className="h-4 w-4 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t.profileChoiceDirectTitle}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                    {t.profileChoiceDirectDesc}
                  </p>
                </div>
              </button>
              {/* Manual (Personal) option */}
              <button
                type="button"
                onClick={() => handleConnect("manual")}
                disabled={connecting}
                className="group w-full flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-amber-400/40 hover:bg-amber-500/10 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="flex-shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-white/10">
                  <Bell className="h-4 w-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t.profileChoiceManualTitle}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                    {t.profileChoiceManualDesc}
                  </p>
                </div>
              </button>
              {connecting && (
                <div className="flex items-center justify-center gap-2 pt-1 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Připojuji…
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 sm:px-8 pb-4">
              <Button
                onClick={() => handleConnect("direct")}
                disabled={connecting}
                className="w-full py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Připojuji…
                  </>
                ) : (
                  t.connectButton
                )}
              </Button>
            </div>
          )}

          {/* Learn more link – only render when URL is provided */}
          {t.learnMoreUrl && (
            <div className="px-6 sm:px-8 pb-6 text-center">
              <a
                href={t.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 hover:text-muted-foreground/90 transition-colors"
              >
                {t.learnMore}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
