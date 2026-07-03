"use client";

import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Calendar as CalendarIcon, ChevronRight as ChevronRightIcon, Loader2, MapPin, X } from "lucide-react";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";
import { PLATFORMS } from "@/lib/constants/platforms";
import { PlatformIconMap } from "./post-calendar-chip";

interface NewPostModalProps {
  open: boolean;
  onClose: () => void;
  modalDay: Date | null;
  formContent: string;
  formPlatforms: string[];
  formScheduledAt: string;
  formLocation: string;
  formTags: string[];
  formTagDraft: string;
  formSelectedTagIds: string[];
  formLoading: boolean;
  formError: string | null;
  locale: string;
  onContentChange: (value: string) => void;
  onTogglePlatform: (platformId: string) => void;
  onLocationChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onCommitTag: (raw: string) => void;
  onRemoveTag: (tag: string) => void;
  onSelectedTagIdsChange: (ids: string[]) => void;
  onScheduledAtChange: (value: string) => void;
  onSubmit: (status: "draft" | "scheduled" | "published") => void;
  t: {
    newPost?: string;
    content?: string;
    contentPlaceholder?: string;
    selectPlatforms?: string;
    saveDraft?: string;
    schedule?: string;
    publishNow?: string;
    scheduledAt?: string;
    saving?: string;
    addTags?: string;
    internalTags?: string;
    internalTagsPlaceholder?: string;
    createTag?: string;
    noInternalTags?: string;
    selectColor?: string;
    add?: string;
    cancel?: string;
    errorSaving?: string;
  };
}

export function NewPostModal({
  open,
  onClose,
  modalDay,
  formContent,
  formPlatforms,
  formScheduledAt,
  formLocation,
  formTags,
  formTagDraft,
  formSelectedTagIds,
  formLoading,
  formError,
  locale,
  onContentChange,
  onTogglePlatform,
  onLocationChange,
  onTagChange,
  onCommitTag,
  onRemoveTag,
  onSelectedTagIdsChange,
  onScheduledAtChange,
  onSubmit,
  t,
}: NewPostModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg rounded-[20px] bg-white/90 dark:bg-card/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/10 p-0 sm:max-w-lg" showCloseButton>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold">
            {t.newPost || "Nový příspěvek"}
            {modalDay && (
              <span className="font-normal text-muted-foreground/60 text-sm ml-2">
                – {format(modalDay, "d. MMMM yyyy", { locale: locale === "cs" ? cs : undefined })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {formError && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="modal-content" className="text-sm font-medium text-muted-foreground/80">
                {t.content || "Obsah"}
              </Label>
              <AIAssistantButton
                content={formContent}
                onContentReplace={(text) => onContentChange(text)}
                onTagsAdd={(newTags) => {
                  // Tags are handled by parent
                }}
              />
            </div>
            <Textarea
              id="modal-content"
              placeholder={t.contentPlaceholder || "Napište příspěvek..."}
              value={formContent}
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-[120px] resize-y bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            />
            {/* Dynamic character limit */}
            {(() => {
              const limits: Record<string, number> = {
                twitter: 280, x: 280, instagram: 2200, linkedin: 3000,
                facebook: Infinity, youtube: 5000, tiktok: 4000,
              };
              const maxLimit = formPlatforms.length > 0
                ? Math.min(...formPlatforms.map((p) => limits[p] ?? Infinity))
                : Infinity;
              return (
                <div className="flex justify-end text-xs text-muted-foreground/60">
                  <span className={maxLimit !== Infinity && formContent.length > maxLimit ? "text-destructive" : ""}>
                    {formContent.length}
                    {maxLimit !== Infinity ? ` / ${maxLimit}` : ""}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t.selectPlatforms || "Vyberte platformy"}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = formPlatforms.includes(platform.id);
                const Icon = PlatformIconMap[platform.id];
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => onTogglePlatform(platform.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                        : "border-gray-200 bg-gray-50 text-muted-foreground hover:bg-gray-100 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">Lokace</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={formLocation}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder={t.scheduledAt || "Přidejte lokaci..."}
                className="h-10 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 pl-10 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t.addTags || "Štítky"}
            </Label>
            {formTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 px-3 py-1 text-xs text-indigo-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={formTagDraft}
              onChange={(e) => onTagChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCommitTag(formTagDraft);
                }
                if (e.key === "Backspace" && formTagDraft.length === 0 && formTags.length > 0) {
                  onRemoveTag(formTags[formTags.length - 1] ?? "");
                }
              }}
              placeholder={t.addTags || "Přidat štítky..."}
              className="h-10 rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Internal organization tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t.internalTags || "Interní štítky"}
            </Label>
            <TagPicker
              selectedTagIds={formSelectedTagIds}
              onChange={onSelectedTagIdsChange}
              t={{
                placeholder: t.internalTagsPlaceholder || "Vyberte štítky…",
                createTag: t.createTag || "Vytvořit štítek",
                noTags: t.noInternalTags || "Žádné další štítky",
                selectColor: t.selectColor || "Barva:",
                add: t.add || "Přidat",
                cancel: t.cancel || "Zrušit",
              }}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t.scheduledAt || "Naplánovat"}
            </Label>
            <DateTimePicker value={formScheduledAt} onChange={onScheduledAtChange} locale={locale} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-white/5">
          <Button
            type="button"
            onClick={() => onSubmit("draft")}
            disabled={!formContent.trim() || formLoading}
            variant="outline"
            className="rounded-xl border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {formLoading ? (t.saving || "Ukládání...") : (t.saveDraft || "Koncept")}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit("scheduled")}
            disabled={!formContent.trim() || !formScheduledAt || formLoading}
            className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
            {formLoading ? (t.saving || "Ukládání...") : (t.schedule || "Naplánovat")}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit("published")}
            disabled={!formContent.trim() || formPlatforms.length === 0 || formLoading}
            className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {formLoading ? (t.saving || "Ukládání...") : (t.publishNow || "Publikovat")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
