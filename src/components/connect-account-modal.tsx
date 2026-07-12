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
import { Check, Sparkles, BarChart3, AlertTriangle, ExternalLink, X, Loader2 } from "lucide-react";
import type { ComponentType } from "react";

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  PlatformIcon: ComponentType<{ className?: string }>;
  onConnect: (publishingType: "direct" | "manual") => void | Promise<void>;
  // Krok 4.3 (Prompt 026): already-connected accounts of THIS platform, so the
  // modal can show their identity (avatar + name + direct/manual badge) and
  // make it clear the user can connect ANOTHER account of the same platform.
  connectedAccounts?: Array<{
    account_name: string;
    avatar_url?: string | null;
  }>;
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
    alreadyConnected?: string;
    connectAnotherHint?: string;
  };
}

// Krok 4.3: tiny avatar with graceful fallback to the platform icon.
function AccountThumb({
  src,
  alt,
  Fallback,
}: {
  src?: string | null;
  alt: string;
  Fallback: ComponentType<{ className?: string }>;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return <Fallback className="h-4 w-4 text-muted-foreground" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="h-full w-full object-cover"
    />
  );
}

export function ConnectAccountModal({
  open,
  onOpenChange,
  platformName,
  PlatformIcon,
  onConnect,
  connectedAccounts,
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

          {/* Krok 4.3: already-connected accounts of THIS platform, so the user
              can see their identity (avatar + name + direct/manual badge) and
              understand they can connect ANOTHER account of the same platform. */}
          {connectedAccounts && connectedAccounts.length > 0 && (
            <div className="px-6 sm:px-8 pb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 mb-3">
                {t.alreadyConnected || "Již propojeno"}
              </p>
              <div className="space-y-2">
                {connectedAccounts.map((acc, i) => (
                  <div
                    key={`${acc.account_name}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10">
                      <AccountThumb
                        src={acc.avatar_url}
                        alt={acc.account_name}
                        Fallback={PlatformIcon}
                      />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {acc.account_name}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground/60 leading-relaxed">
                {t.connectAnotherHint ||
                  "Připojením dalšího účtu přidáte nový účet stejné sítě."}
              </p>
            </div>
          )}

          {/* Main action area – always connect a business account (auto-publish). */}
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
