"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Instagram, Facebook, Linkedin, XIcon, Youtube, TikTok } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import type { PostPlatform } from "@/app/[locale]/(dashboard)/posts/_post-card";

const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const PlatformIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: XIcon,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    status: string;
    post_platforms?: PostPlatform[];
  };
  /**
   * Called when the user confirms the destructive action.
   * - `selectedPlatforms`: platforms the user wants to be removed
   *   (Facebook / Instagram / YouTube are actually deleted via the
   *   platform API; LinkedIn is an information-only selection that
   *   reminds the user to remove the post manually on LinkedIn).
   * - `deleteFromApp`: whether to hard-delete the post from the DB.
   *   When `false`, the post row stays in Postio and the platform
   *   rows that support API deletion (Facebook / Instagram / YouTube)
   *   are reset to `draft`. LinkedIn (and Instagram) keep showing as
   *   `published` so the rest of the post keeps syncing normally.
   */
  onConfirm: (selectedPlatforms: string[], deleteFromApp: boolean) => Promise<void>;
  isDeleting: boolean;
}

export function DeletePostDialog({ open, onOpenChange, post, onConfirm, isDeleting }: DeletePostDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [deleteFromApp, setDeleteFromApp] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [livePlatforms, setLivePlatforms] = useState<string[]>([]);
  // Confirmation overlay for platforms that can't be deleted via API
  const [showApiWarning, setShowApiWarning] = useState(false);
  const t = useTranslations("posts");

  // Derived initial platforms
  const initialPublishedPlatforms = (post.post_platforms || [])
    .filter(p => p.status === "published" && p.external_id)
    .map(p => p.platform);

  // Fetch fresh post data when dialog opens
  const refreshPostData = useCallback(async (postId: string) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, post_platforms(platform, status, external_id)")
        .eq("id", postId)
        .single();

      if (!error && data) {
        const platforms = (data.post_platforms || [])
          .filter((p: any) => p.status === "published" && p.external_id)
          .map((p: any) => p.platform);
        setLivePlatforms(platforms);
        setSelectedPlatforms(platforms);
      }
    } catch {
      // Silently fall back to props data
      setLivePlatforms(initialPublishedPlatforms);
      setSelectedPlatforms(initialPublishedPlatforms);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, initialPublishedPlatforms]);

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      setLivePlatforms(initialPublishedPlatforms);
      setSelectedPlatforms(initialPublishedPlatforms);
      setDeleteFromApp(true);
      setShowApiWarning(false);
      refreshPostData(post.id);
    }
  }, [open, post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // LinkedIn is intentionally included in the selectable platforms
  // list, but only as an information-only checkbox: Postio does not
  // call the LinkedIn UGC API DELETE (it has no working sync, so we
  // cannot reliably confirm that the API actually took effect). The
  // checkbox just reminds the user to remove the post manually on
  // LinkedIn – the row in `post_platforms` stays at `status="published"`
  // so the rest of the post keeps syncing normally.
  const hasLinkedInPublished = livePlatforms.includes("linkedin");
  const selectablePlatforms = livePlatforms; // includes LinkedIn
  const showSelectiveDelete = selectablePlatforms.length > 0;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  // Platforms that cannot be deleted via API – need user confirmation first
  const noApiPlatforms = ["instagram", "linkedin"] as const;
  const selectedNoApiPlatforms = selectedPlatforms.filter(p => noApiPlatforms.includes(p as typeof noApiPlatforms[number]));

  const handleConfirm = () => {
    if (showSelectiveDelete && selectedNoApiPlatforms.length > 0) {
      // Show warning overlay before proceeding
      setShowApiWarning(true);
      return;
    }

    if (showSelectiveDelete) {
      onConfirm(selectedPlatforms, deleteFromApp);
    } else {
      onConfirm([], true);
    }
  };

  const handleWarningConfirm = () => {
    setShowApiWarning(false);
    onConfirm(selectedPlatforms, deleteFromApp);
  };

  // Description copy is platform-aware so the user always knows what
  // they are about to do. LinkedIn is treated the same as Instagram
  // (Postio does not call any API for it – the user has to remove the
  // post manually on LinkedIn), so the LinkedIn text now reads as an
  // informational note rather than a "we'll archive it for you"
  // promise. YouTube and Facebook keep the normal "delete from
  // platform via API" UX.
  const descriptionText = (() => {
    if (hasLinkedInPublished && livePlatforms.length === 1) {
      return "Tento příspěvek je publikován pouze na LinkedInu. Postio ho neumí smazat z LinkedInu automaticky – zaškrtni \u201ESmazat z LinkedIn\u201C jen pro potvrzení, že příspěvek smažeš ručně na LinkedInu. Pokud zároveň zaškrtneš \u201ETrvale smazat z aplikace\u201C, příspěvek zmizí i z Postia. Jinak zůstane v Postiu jako publikovaný (dokud LinkedIn nepotvrdí smazání).";
    }
    if (hasLinkedInPublished && livePlatforms.length > 1) {
      return "Tento příspěvek je publikován na více sítích. U Facebooku, Instagramu a YouTube Postio smaže příspěvek z platformy automaticky. LinkedIn je nutné smazat ručně – zaškrtnutí \u201ESmazat z LinkedIn\u201C ti připomene, že tam musíš příspěvek odstranit sám/sama. Ostatní platformy příspěvku zůstanou publikované a budou se dál synchronizovat.";
    }
    if (showSelectiveDelete) {
      return "Tento příspěvek je publikován na sociálních sítích. Vyberte, odkud jej chcete odstranit:";
    }
    return "Opravdu chcete tento příspěvek smazat? Tato akce je nevratná.";
  })();

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isDeleting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[480px] bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            Smazat příspěvek
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-foreground/80">
            {descriptionText}
          </DialogDescription>
        </DialogHeader>

        {showSelectiveDelete && (
          <div className="space-y-3 py-4">
            {refreshing ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Načítám aktuální stav…
              </div>
            ) : (
              <>
                {/* Platform checkboxes – LinkedIn is included as an
                    information-only checkbox (no API call). */}
                {selectablePlatforms.map(platform => {
                  const Icon = PlatformIcon[platform] ?? null;
                  return (
                    <div
                      key={platform}
                      className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                      onClick={() => togglePlatform(platform)}
                    >
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border shrink-0",
                        selectedPlatforms.includes(platform)
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-300 dark:border-gray-600"
                      )}>
                        {selectedPlatforms.includes(platform) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      {Icon && (
                        <Icon className="h-5 w-5 shrink-0 text-foreground/60" />
                      )}
                      <span className="font-medium text-foreground flex-1">
                        Smazat z {PLATFORM_NAMES[platform] || platform}
                      </span>
                      {noApiPlatforms.includes(platform as typeof noApiPlatforms[number]) && selectedPlatforms.includes(platform) && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          Ruční smazání
                        </span>
                      )}
                    </div>
                  );
                })}

                <div className="my-2 h-px bg-black/5 dark:bg-white/5" />

                {/* Delete from app checkbox – distinct red styling */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border border-red-500/25 bg-red-50/50 dark:bg-red-500/10 cursor-pointer transition-colors"
                  onClick={() => setDeleteFromApp(!deleteFromApp)}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border shrink-0",
                    deleteFromApp
                      ? "bg-red-600 border-red-600"
                      : "border-red-300 dark:border-red-800"
                  )}>
                    {deleteFromApp && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    Trvale smazat z aplikace Postio
                  </span>
                </div>

                {!deleteFromApp && (
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    Příspěvek zůstane v kalendáři Postio a bude nadále zobrazen jako publikovaný. Z vybraných platforem bude odstraněn (kde to Postio umí přes API) a u ostatních platforem dostaneš připomínku, že je třeba je smazat ručně.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* API warning confirmation overlay – shown on top of the dialog content */}
        {showApiWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 rounded-[24px] backdrop-blur-[2px] p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t("apiDeletionWarningTitle") || "Smazání přes API není podporováno"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectedNoApiPlatforms.map(p => PLATFORM_NAMES[p] || p).join(", ")}
                  </div>
                </div>
              </div>

              <p className="text-sm text-foreground/80 leading-relaxed">
                {selectedNoApiPlatforms.map(p => {
                  const name = (PLATFORM_NAMES[p] || p).charAt(0).toUpperCase() + (PLATFORM_NAMES[p] || p).slice(1);
                  return t("toastApiNotSupported", { platform: name });
                }).join(" ")}
              </p>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs border-black/10 dark:border-white/10"
                  onClick={() => setShowApiWarning(false)}
                  disabled={isDeleting}
                >
                  {t("deleteDialogBack") || "Zpět"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl text-xs shadow-lg shadow-red-500/20"
                  onClick={handleWarningConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Mažu…" : t("toastUnderstood") || "Rozumím, pokračovat"}
                </Button>
              </div>
            </div>
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
            Zrušit
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl shadow-lg shadow-red-500/20"
            onClick={handleConfirm}
            disabled={isDeleting || refreshing || (showSelectiveDelete && selectedPlatforms.length === 0 && !deleteFromApp)}
          >
            {isDeleting ? "Mažu…" : "Potvrdit smazání"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
