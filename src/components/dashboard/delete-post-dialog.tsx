"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Loader2 } from "lucide-react";
import { Instagram, Facebook, Linkedin, XIcon, Youtube, TikTok } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
  onConfirm: (selectedPlatforms: string[], deleteFromApp: boolean) => Promise<void>;
  isDeleting: boolean;
}

export function DeletePostDialog({ open, onOpenChange, post, onConfirm, isDeleting }: DeletePostDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [deleteFromApp, setDeleteFromApp] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [livePlatforms, setLivePlatforms] = useState<string[]>([]);

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
      refreshPostData(post.id);
    }
  }, [open, post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPublishedPlatforms = livePlatforms.length > 0;
  const showSelectiveDelete = hasPublishedPlatforms;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleConfirm = () => {
    if (showSelectiveDelete) {
      onConfirm(selectedPlatforms, deleteFromApp);
    } else {
      onConfirm([], true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isDeleting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[425px] bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            Smazat příspěvek
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-foreground/80">
            {showSelectiveDelete
              ? "Tento příspěvek je publikován na sociálních sítích. Vyberte, odkud jej chcete odstranit:"
              : "Opravdu chcete tento příspěvek smazat? Tato akce je nevratná."}
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
                {/* Platform checkboxes with icons */}
                {livePlatforms.map(platform => {
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
                      <span className="font-medium text-foreground">
                        Smazat z {PLATFORM_NAMES[platform] || platform}
                      </span>
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
                    Smazat také z aplikace Postio
                  </span>
                </div>

                {!deleteFromApp && (
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    Příspěvek zůstane v kalendáři Postio, ale bude odstraněn z vybraných sociálních sítí.
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