"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X,
  Loader2,
  CheckCircle2,
  Tag,
  PlusCircle,
} from "lucide-react";
import { Facebook } from "@/components/ui/social-icons";
import { toggleAccountActive } from "@/lib/actions/social-accounts";

export type FacebookPageDto = {
  id: string;
  platform_id: string;
  account_name: string;
  avatar_url: string | null;
  category: string | null;
  created_at: string;
};

interface FacebookPageSelectorProps {
  pages: FacebookPageDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a page is toggled so the parent can refresh its lists. */
  onChanged?: () => void;
  /** i18n strings – keeps the dialog decoupled from next-intl usage. */
  t: {
    title: string;
    subtitle: string;
    noCategory: string;
    categoryLabel: (category: string) => string;
    inactive: string;
    activating: string;
    done: string;
    pageConnected: (name: string) => string;
    errorToggle: string;
    emptyState: string;
    activateAll: (count: number) => string;
    activatingAll: string;
    allActivated: (count: number) => string;
    someFailed: (failed: number) => string;
    connectPage: string;
  };
}

/**
 * FacebookPageSelector
 *
 * A glassmorphism dialog that lists every Facebook Page currently stored as
 * `is_active = false` for the current user. The user clicks a "Connect"
 * button to enable a Page for publishing, or uses the bulk-activate button
 * to enable all pages at once.
 */
export function FacebookPageSelector({
  pages,
  open,
  onOpenChange,
  onChanged,
  t,
}: FacebookPageSelectorProps) {
  const [items, setItems] = useState<FacebookPageDto[]>(pages);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkActivating, setBulkActivating] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(pages);
  }, [pages]);

  const handleConnect = async (page: FacebookPageDto) => {
    // Optimistic: remove from list immediately
    setItems((prev) => prev.filter((p) => p.id !== page.id));

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(page.id);
      return next;
    });

    startTransition(async () => {
      const result = await toggleAccountActive(page.id, true);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(page.id);
        return next;
      });

      if (result.success) {
        toast.success(t.pageConnected(page.account_name));
        onChanged?.();
      } else {
        // Revert optimistic update on failure
        setItems(pages);
        toast.error(result.error ?? t.errorToggle);
      }
    });
  };

  const handleActivateAll = async () => {
    if (bulkActivating) return;
    const toActivate = items;
    if (toActivate.length === 0) return;

    const ids = toActivate.map((p) => p.id);
    setBulkActivating(true);

    // Optimistic: clear the list immediately
    setItems([]);
    setPendingIds(new Set(ids));

    const results = await Promise.allSettled(
      ids.map((id) => toggleAccountActive(id, true))
    );

    setPendingIds(new Set());
    setBulkActivating(false);

    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    );
    const succeeded = ids.length - failed.length;

    if (failed.length === 0) {
      toast.success(t.allActivated(succeeded));
    } else {
      toast.error(t.someFailed(failed.length));
      setItems(pages);
    }

    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">{t.title}</DialogTitle>

        {/* Close button – uses DialogClose for proper Radix a11y */}
        <DialogClose asChild>
          <button
            className="absolute top-5 right-5 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            aria-label={t.done}
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        <div className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center sm:px-8 sm:pt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 mb-4">
              <Facebook className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground/70 max-w-sm mx-auto leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Pages list */}
          <div className="px-6 sm:px-8 pb-2">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground/60">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400/70" />
                {t.emptyState}
              </div>
            ) : (
              <>
                {/* Bulk-activate action */}
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleActivateAll}
                    disabled={bulkActivating}
                    className="mb-3 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm font-medium"
                  >
                    {bulkActivating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.activatingAll}
                      </>
                    ) : (
                      <>{t.activateAll(items.length)}</>
                    )}
                  </Button>
                )}

                <ul className="space-y-2">
                  {items.map((page) => {
                    const isPending = pendingIds.has(page.id);
                    return (
                      <li
                        key={page.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
                      >
                        {/* Avatar */}
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 overflow-hidden">
                          {page.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={page.avatar_url}
                              alt={page.account_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Facebook className="h-5 w-5 text-blue-300" />
                          )}
                        </div>

                        {/* Name + category */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {page.account_name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                            <Tag className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {page.category
                                ? t.categoryLabel(page.category)
                                : t.noCategory}
                            </span>
                          </p>
                        </div>

                        {/* Connect button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(page)}
                          disabled={isPending || bulkActivating}
                          className="flex-shrink-0 rounded-xl border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs h-8 px-3"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <PlusCircle className="h-3.5 w-3.5 mr-1" />
                              {t.connectPage}
                            </>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 pt-4 pb-6">
            <DialogClose asChild>
              <button
                className="w-full py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all"
              >
                {t.done}
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
