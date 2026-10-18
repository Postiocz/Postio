"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Loader2, Info } from "lucide-react";
import { Instagram, Facebook, Linkedin, XIcon, Youtube, TikTok } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import { proxyImageUrl } from "@/lib/image-proxy";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import type { PostPlatform } from "@/app/[locale]/(dashboard)/posts/_post-card";
import {
  buildDeleteTargets,
  platformDisplayName,
  type DeleteTarget,
} from "@/lib/delete-capabilities";

const PlatformIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: XIcon,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

/** A single published platform row for this post, resolved from a joined query. */
type PublishedAccount = {
  /** social_accounts.id — the concrete account to target in deleteFromMeta. */
  id: string;
  platform: string;
  /** Display name from social_accounts (falls back to the platform key). */
  name: string;
  avatar: string | null;
  /** Reference id on the platform; required to call a delete API. */
  externalId: string | null;
};

/** What the user chose in the dialog, handed back to the caller. */
export interface DeleteDialogResult {
  /** account ids of API-deletable platforms the user wants removed via API. */
  deleteAccountIds: string[];
  /** platforms without API deletion — archived in Postio, removed manually. */
  manualPlatforms: string[];
  /** when true the post is permanently removed from Postio. */
  deleteFromApp: boolean;
}

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    status: string;
    post_platforms?: PostPlatform[];
  };
  onConfirm: (result: DeleteDialogResult) => Promise<void>;
  isDeleting: boolean;
}

export function DeletePostDialog({ open, onOpenChange, post, onConfirm, isDeleting }: DeletePostDialogProps) {
  const [rows, setRows] = useState<PublishedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  // Default = archive, NOT permanent removal. Archiving keeps the post in
  // Postio (with its publish date and network data) so it can be restored.
  const [deleteFromApp, setDeleteFromApp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = useTranslations("posts");

  // Published rows derived from props (flagged `published`; an `external_id`
  // is NOT required — a published row without one is still offered, as an
  // informational "delete manually" note).
  const initialRows: PublishedAccount[] = (post.post_platforms || [])
    .filter(p => p.status === "published")
    .map(p => ({
      id: p.account_id ?? "",
      platform: p.platform,
      name: p.platform,
      avatar: null,
      externalId: p.external_id ?? null,
    }));

  // api-deletable account ids selection (checkbox targets), everything else is
  // an informational row. Selection is the *source of truth* for confirm.
  const defaultsFor = useCallback((list: PublishedAccount[]): string[] => {
    const targets = buildDeleteTargets(
      list.map(r => ({ account_id: r.id || null, platform: r.platform, status: "published", external_id: r.externalId })),
    );
    return targets.flatMap(tg => (tg.kind === "checkbox" ? [tg.accountId] : []));
  }, []);

  // Fetch fresh post data when dialog opens (accounts/avatars + current status).
  const refreshPostData = useCallback(async (postId: string) => {
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, post_platforms(account_id, platform, status, external_id, social_accounts(account_name, avatar_url))")
        .eq("id", postId)
        .single();

      if (!error && data) {
        const list: PublishedAccount[] = (data.post_platforms || [])
          .filter((p) => p.status === "published")
          .map((p) => {
            const acc = Array.isArray(p.social_accounts) ? p.social_accounts[0] : p.social_accounts;
            return {
              id: p.account_id ?? "",
              platform: p.platform,
              name: acc?.account_name ?? p.platform,
              avatar: acc?.avatar_url ?? null,
              externalId: p.external_id ?? null,
            };
          });
        setRows(list);
        setSelectedAccountIds(defaultsFor(list));
      }
    } catch {
      // Silently fall back to props data
      setRows(initialRows);
      setSelectedAccountIds(defaultsFor(initialRows));
    } finally {
      setRefreshing(false);
    }
  }, [defaultsFor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize state when the dialog opens.
  useEffect(() => {
    if (open) {
      setRows(initialRows);
      setSelectedAccountIds(defaultsFor(initialRows));
      setDeleteFromApp(false);
      refreshPostData(post.id);
    }
  }, [open, post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPublished = rows.length > 0;

  // What the dialog offers, decided by the single source of truth.
  const targets: DeleteTarget[] = buildDeleteTargets(
    rows.map(r => ({ account_id: r.id || null, platform: r.platform, status: "published", external_id: r.externalId })),
  );
  const checkboxTargets = targets.filter((tg): tg is Extract<DeleteTarget, { kind: "checkbox" }> => tg.kind === "checkbox");
  const infoTargets = targets.filter((tg): tg is Extract<DeleteTarget, { kind: "info" }> => tg.kind === "info");

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    if (hasPublished) {
      onConfirm({
        deleteAccountIds: selectedAccountIds,
        manualPlatforms: infoTargets.map(tg => tg.platform),
        deleteFromApp,
      });
    } else {
      onConfirm({ deleteAccountIds: [], manualPlatforms: [], deleteFromApp: true });
    }
  };

  const descriptionText = hasPublished
    ? t("deleteDialogDescSelective")
    : t("deleteDialogDescNoPlatform");

  const infoTextFor = (target: Extract<DeleteTarget, { kind: "info" }>): string => {
    if (target.platform === "tiktok") return t("deleteInfoNoApiTikTok");
    const name = platformDisplayName(target.platform);
    return target.reason === "no_reference"
      ? t("deleteInfoNoExternalId", { platform: name })
      : t("deleteInfoNoApi", { platform: name });
  };

  const confirmDisabled =
    isDeleting ||
    refreshing ||
    (hasPublished && selectedAccountIds.length === 0 && !deleteFromApp && infoTargets.length === 0);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isDeleting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[480px] bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            {t("deletePost")}
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-foreground/80">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>

        {hasPublished && (
          <div className="space-y-3 py-4">
            {refreshing ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("deleteDialogLoading")}
              </div>
            ) : (
              <>
                {/* API-deletable platforms → "Smazat z <účet>" checkbox (checked by default). */}
                {checkboxTargets.map(target => {
                  const acc = rows.find(r => r.id === target.accountId);
                  const selected = selectedAccountIds.includes(target.accountId);
                  const Icon = acc ? PlatformIcon[acc.platform] ?? null : null;
                  const label = acc?.name || platformDisplayName(target.platform);
                  return (
                    <div
                      key={target.accountId}
                      className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                      onClick={() => toggleAccount(target.accountId)}
                    >
                      {acc?.avatar ? (
                        <img
                          src={proxyImageUrl(acc.avatar)}
                          alt={label}
                          className="h-7 w-7 rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shrink-0">
                          {label.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {Icon && <Icon className="h-5 w-5 shrink-0 text-foreground/60" />}
                      <span className="font-medium text-foreground flex-1">
                        {t("deleteFromAccount", { account: label })}
                      </span>
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border shrink-0",
                        selected ? "bg-indigo-500 border-indigo-500" : "border-gray-300 dark:border-gray-600",
                      )}>
                        {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })}

                {/* Platforms without API deletion (or without a reference id) →
                    informational note: archived in Postio, removed manually. */}
                {infoTargets.map(target => (
                  <div
                    key={`info-${target.platform}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/10"
                  >
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      {infoTextFor(target)}
                    </p>
                  </div>
                ))}

                <div className="my-2 h-px bg-black/5 dark:bg-white/5" />

                {/* Permanent removal from Postio — unchecked by default (archive). */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border border-red-500/25 bg-red-50/50 dark:bg-red-500/10 cursor-pointer transition-colors"
                  onClick={() => setDeleteFromApp(!deleteFromApp)}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border shrink-0",
                    deleteFromApp ? "bg-red-600 border-red-600" : "border-red-300 dark:border-red-800",
                  )}>
                    {deleteFromApp && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {t("deleteFromApp")}
                  </span>
                </div>

                {!deleteFromApp && (
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    {t("deleteKeepNote")}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-black/10 dark:border-white/10"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting || refreshing}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl shadow-lg shadow-red-500/20"
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {isDeleting ? t("deleting") : t("confirmDeleteButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
