"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X,
  Loader2,
  CheckCircle2,
  Tag,
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
    /**
     * Dynamic label that must receive the Facebook Page category.
     * Implemented as a function so the caller (parent page) can pass the
     * value to next-intl `t()` and avoid ICU "variable not provided" errors.
     */
    categoryLabel: (category: string) => string;
    active: string;
    inactive: string;
    activating: string;
    deactivating: string;
    done: string;
    /**
     * Toast message shown after a page is activated. The `name` argument is
     * the Facebook Page name. Implemented as a function so the parent can
     * pass the dynamic value to next-intl `t()`.
     */
    pageConnected: (name: string) => string;
    pageDisconnected: (name: string) => string;
    errorToggle: string;
    emptyState: string;
  };
}

/**
 * FacebookPageSelector
 *
 * A glassmorphism dialog that lists every Facebook Page currently stored as
 * `is_active = false` for the current user. The user can flip a Switch to
 * enable a Page for publishing, or to disable it again.
 *
 * Updates go through the `toggleAccountActive` server action, which performs
 * an ownership check on the row before writing. The local list is updated
 * optimistically; the server response triggers a toast and a parent
 * `onChanged` callback so the surrounding accounts list re-fetches.
 */
export function FacebookPageSelector({
  pages,
  open,
  onOpenChange,
  onChanged,
  t,
}: FacebookPageSelectorProps) {
  // Mirror the pages prop in local state so that toggling moves the row
  // between the "inactive" list and the parent's active list without having
  // to remount the dialog.
  const [items, setItems] = useState<FacebookPageDto[]>(pages);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Keep local state in sync when the parent re-fetches and passes a new
  // pages array (e.g. after a successful toggle). The shallow comparison is
  // intentional: we only re-sync when the array reference changes.
  useEffect(() => {
    setItems(pages);
  }, [pages]);

  const handleToggle = async (page: FacebookPageDto, nextActive: boolean) => {
    // Optimistic update: mark the page as active/inactive in local state.
    if (nextActive) {
      // Once activated, the page is no longer in the "pending" list – remove
      // it from the local list to give the user immediate visual feedback.
      setItems((prev) => prev.filter((p) => p.id !== page.id));
    } else {
      // Deactivating a page from the dialog is technically impossible
      // (this dialog only shows inactive pages), but if a parent re-uses
      // it for active pages later we still handle it gracefully.
      setItems((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p } : p))
      );
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(page.id);
      return next;
    });

    startTransition(async () => {
      const result = await toggleAccountActive(page.id, nextActive);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(page.id);
        return next;
      });

      if (result.success) {
        toast.success(
          nextActive
            ? t.pageConnected(page.account_name)
            : t.pageDisconnected(page.account_name)
        );
        onChanged?.();
      } else {
        // Revert the optimistic update on failure by re-syncing with the
        // parent's page list (which the parent will refresh via onChanged).
        setItems(pages);
        toast.error(result.error ?? t.errorToggle);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl p-0 overflow-hidden bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl"
      >
        <DialogTitle className="sr-only">{t.title}</DialogTitle>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 z-10 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t.done}
        >
          <X className="h-4 w-4" />
        </button>

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

                      {/* Switch / loader */}
                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                        ) : (
                          <Switch
                            checked={false}
                            onCheckedChange={(checked) =>
                              handleToggle(page, checked)
                            }
                            aria-label={t.active}
                            size="default"
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 pt-4 pb-6">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full py-4 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all"
            >
              {t.done}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
