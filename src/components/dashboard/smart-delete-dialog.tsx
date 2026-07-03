"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutoDeleteOption = "never" | "3d" | "7d" | "30d" | "365d";

const AUTO_DELETE_LABELS: Record<AutoDeleteOption, string> = {
  never: "Nikdy (uchovat pro archivaci)",
  "3d": "Za 3 dny",
  "7d": "Za 7 dní",
  "30d": "Za 30 dní",
  "365d": "Za 1 rok",
};

interface SmartDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "keep_as_draft" | "delete_from_app", autoDelete: AutoDeleteOption) => Promise<void>;
  isDeleting: boolean;
}

export function SmartDeleteDialog({ open, onOpenChange, onConfirm, isDeleting }: SmartDeleteDialogProps) {
  const [mode, setMode] = useState<"keep_as_draft" | "delete_from_app" | null>(null);
  const [autoDelete, setAutoDelete] = useState<AutoDeleteOption>("never");

  const handleConfirm = () => {
    if (mode) {
      onConfirm(mode, autoDelete);
      // Reset state on confirm
      setMode(null);
      setAutoDelete("never");
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!isDeleting) {
      onOpenChange(val);
      if (!val) {
        setMode(null);
        setAutoDelete("never");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[24px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Trash2 className="h-5 w-5" />
            </div>
            Chytré mazání
          </DialogTitle>
          <DialogDescription className="text-base pt-2 text-foreground/80">
            Tento příspěvek byl odstraněn z platformy. Vyberte co chcete udělat:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Option 1: Keep as draft */}
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
              mode === "keep_as_draft"
                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
                : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            )}
            onClick={() => setMode("keep_as_draft")}
          >
            <div className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border shrink-0 mt-0.5",
              mode === "keep_as_draft"
                ? "bg-indigo-500 border-indigo-500"
                : "border-gray-300 dark:border-gray-600"
            )}>
              {mode === "keep_as_draft" && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="font-medium text-foreground">Ponechat jako koncept</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Příspěvek zůstane v aplikaci jako koncept. Můžete jej upravit a publikovat znovu.
              </p>
            </div>
          </div>

          {/* Option 2: Delete from app */}
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
              mode === "delete_from_app"
                ? "border-red-500 bg-red-50/50 dark:bg-red-500/10"
                : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            )}
            onClick={() => setMode("delete_from_app")}
          >
            <div className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border shrink-0 mt-0.5",
              mode === "delete_from_app"
                ? "bg-red-600 border-red-600"
                : "border-gray-300 dark:border-gray-600"
            )}>
              {mode === "delete_from_app" && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">Smazat z aplikace Postio</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Příspěvek bude trvale odstraněn z aplikace. Tato akce je nevratná.
              </p>
            </div>
          </div>

          {/* Auto-delete timer – only show when mode is selected */}
          {mode && (
            <>
              <div className="my-2 h-px bg-black/5 dark:bg-white/5" />

              <div className="flex items-start gap-3 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium text-sm text-foreground">Automatické mazání</span>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Pokud tento příspěvek neodstraníte ručně, bude smazán automaticky:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(AUTO_DELETE_LABELS) as AutoDeleteOption[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left",
                          autoDelete === option
                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium"
                            : "border-transparent bg-black/[0.03] dark:bg-white/[0.03] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAutoDelete(option);
                        }}
                      >
                        {AUTO_DELETE_LABELS[option]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-black/10 dark:border-white/10"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Zrušit
          </Button>
          <Button
            type="button"
            variant={mode === "delete_from_app" ? "destructive" : "default"}
            className={cn(
              "rounded-xl",
              mode === "delete_from_app" && "shadow-lg shadow-red-500/20"
            )}
            onClick={handleConfirm}
            disabled={isDeleting || mode === null}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Probíhá…
              </>
            ) : (
              mode === "keep_as_draft" ? "Ponechat jako koncept" : "Smazat trvale"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
