"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, Sparkles } from "lucide-react";
import { Twitter as TwitterIcon } from "@/components/ui/social-icons";

interface XConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Resolves once the manual X account has been saved (called by the page).
  onManualConnect: (username: string) => Promise<void>;
  // OAuth redirect for automatic (API) publishing.
  onAutoConnect: () => void;
}

/**
 * Hybrid X connect modal (Prompt 031-X, Krok 1).
 *
 * Offers two paths:
 *  - Manual (free): user supplies their @handle, Postio saves the account with
 *    publishing_type='manual' and later reminds them instead of calling the API.
 *  - Automatic (coming soon): the OAuth path. Intentionally disabled in the UI
 *    for now (kept in the codebase, surfaced later per the hybrid-X roadmap).
 */
export function XConnectModal({
  open,
  onOpenChange,
  onManualConnect,
  onAutoConnect,
}: XConnectModalProps) {
  const t = useTranslations("accounts");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManual = async () => {
    const handle = username.trim().replace(/^@/, "");
    if (!handle) {
      setError(t("xConnect.usernameRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onManualConnect(`@${handle}`);
      setUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("xConnect.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">{t("xConnect.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("xConnect.subtitle")}
        </DialogDescription>

        {/* Close button – matches ConnectAccountModal a11y pattern */}
        <DialogClose asChild>
          <button
            className="absolute top-5 right-5 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        <div className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          {/* Header with X logo */}
          <div className="px-6 pt-6 pb-4 text-center sm:px-8 sm:pt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 mb-4">
              <TwitterIcon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("xConnect.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed">
              {t("xConnect.subtitle")}
            </p>
          </div>

          {/* Manual option (active) */}
          <div className="px-6 sm:px-8 pb-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-foreground">
                  {t("xConnect.manualTitle")}
                </span>
                <span className="ml-auto inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  {t("xConnect.freeBadge")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3">
                {t("xConnect.manualDesc")}
              </p>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 block">
                {t("xConnect.usernameLabel")}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("xConnect.usernamePlaceholder")}
                className="bg-black/20 border-white/10 focus-visible:ring-indigo-500/50"
                disabled={submitting}
              />
              {error && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}
              <Button
                onClick={handleManual}
                disabled={submitting}
                className="mt-3 w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("xConnect.saving")}
                  </>
                ) : (
                  t("xConnect.manualButton")
                )}
              </Button>
            </div>
          </div>

          {/* Automatic option (API) — requires credits */}
          <div className="px-6 sm:px-8 pb-6">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-semibold text-foreground">
                  {t("xConnect.autoTitle")}
                </span>
                <span className="ml-auto inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                  {t("xConnect.autoCreditCost")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3">
                {t("xConnect.autoDesc")}
              </p>
              <Button
                onClick={onAutoConnect}
                className="mt-3 w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all"
              >
                {t("xConnect.autoButton")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
