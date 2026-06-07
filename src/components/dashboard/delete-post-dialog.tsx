"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    status: string;
    published_platforms: string[];
  };
  onConfirm: (selectedPlatforms: string[], deleteFromApp: boolean) => Promise<void>;
  isDeleting: boolean;
}

export function DeletePostDialog({ open, onOpenChange, post, onConfirm, isDeleting }: DeletePostDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [deleteFromApp, setDeleteFromApp] = useState(true);

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlatforms(post.published_platforms ?? []);
      setDeleteFromApp(true);
    }
  }, [open, post.published_platforms]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const isPublishedMultiple = post.status === "published" && post.published_platforms && post.published_platforms.length > 1;

  const handleConfirm = () => {
    if (isPublishedMultiple) {
      onConfirm(selectedPlatforms, deleteFromApp);
    } else {
      onConfirm(post.published_platforms ?? [], true);
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
            {isPublishedMultiple 
              ? "Tento příspěvek je publikován na sociálních sítích. Vyberte, odkud jej chcete odstranit:"
              : "Opravdu chcete tento příspěvek smazat? Tato akce je nevratná."}
          </DialogDescription>
        </DialogHeader>

        {isPublishedMultiple && (
          <div className="space-y-3 py-4">
            {post.published_platforms.map(platform => (
              <div 
                key={platform}
                className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                onClick={() => togglePlatform(platform)}
              >
                <div className={cn("flex h-5 w-5 items-center justify-center rounded border", selectedPlatforms.includes(platform) ? "bg-indigo-500 border-indigo-500" : "border-gray-300 dark:border-gray-600")}>
                  {selectedPlatforms.includes(platform) && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className="font-medium text-foreground">
                  Smazat z {PLATFORMS[platform] || platform}
                </span>
              </div>
            ))}

            <div className="my-2 h-px bg-black/5 dark:bg-white/5" />

            <div 
              className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 cursor-pointer transition-colors"
              onClick={() => setDeleteFromApp(!deleteFromApp)}
            >
              <div className={cn("flex h-5 w-5 items-center justify-center rounded border", deleteFromApp ? "bg-red-500 border-red-500" : "border-red-300 dark:border-red-800")}>
                {deleteFromApp && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="font-medium text-red-700 dark:text-red-400">
                Smazat také z aplikace Postio
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-black/10 dark:border-white/10"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Zrušit
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl shadow-lg shadow-red-500/20"
            onClick={handleConfirm}
            disabled={isDeleting || (isPublishedMultiple && selectedPlatforms.length === 0 && !deleteFromApp)}
          >
            {isDeleting ? "Mažu..." : "Potvrdit smazání"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
