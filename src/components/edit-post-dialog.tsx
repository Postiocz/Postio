"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { X, MapPin, Loader2, Film, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createPostAction, updatePost } from "@/lib/actions/posts";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";

const PlatformIconMap: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
];

const MAX_MEDIA_FILES = 10;

export interface EditPostData {
  id?: string;
  content: string;
  platforms: string[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  media_urls: string[];
}

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: EditPostData | null;
  locale: string;
  tLabels: {
    newPost: string;
    editPost: string;
    content: string;
    contentPlaceholder: string;
    selectPlatforms: string;
    saveDraft: string;
    schedule: string;
    publishNow: string;
    scheduledAt: string;
    saving: string;
    addTags: string;
    locationPlaceholder: string;
    postCreated: string;
    postUpdated: string;
    errorSaving: string;
    characterCount: string;
    maxFilesReached: string;
    addMedia: string;
    dropMedia: string;
    uploading: string;
    uploadError: string;
    fileTooLarge: string;
    statusDraft: string;
    statusScheduled: string;
    statusPublished: string;
    statusFailed: string;
  };
}

export function EditPostDialog({
  open,
  onOpenChange,
  post,
  locale,
  tLabels,
}: EditPostDialogProps) {
  const isEdit = !!post?.id;

  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const {
    items: mediaItems,
    addFiles: addMediaFiles,
    removeItem: removeMediaItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
  } = useMediaUpload(userId, MAX_MEDIA_FILES);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (open) {
      if (isEdit && post) {
        setContent(post.content);
        setPlatforms(post.platforms ?? []);
        setStatus(post.status);
        setLocation(post.location ?? "");
        setTags(post.tags ?? []);
        if (post.scheduled_at) {
          const d = new Date(post.scheduled_at);
          setScheduledAt(d.toISOString().slice(0, 16));
        } else {
          setScheduledAt("");
        }
        if (post.media_urls && post.media_urls.length > 0) {
          loadExistingUrls(post.media_urls);
        }
      } else {
        setContent("");
        setPlatforms([]);
        setStatus("draft");
        setLocation("");
        setTags([]);
        setScheduledAt("");
      }
      setTagDraft("");
      setError(null);
    }
  }, [open, isEdit, post, loadExistingUrls]);

  const togglePlatform = useCallback((id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const commitTag = useCallback((raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
    const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
    if (!normalized) return;
    const tag = `#${normalized}`;
    setTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      return exists ? prev : [...prev, tag];
    });
    setTagDraft("");
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleCommitRemainingTag = useCallback(() => {
    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t) => t.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");
    return finalTags;
  }, [tags, tagDraft]);

  const handleSubmit = useCallback(
    async (newStatus: "draft" | "scheduled" | "published") => {
      if (!content.trim()) return;
      if (hasUploading()) {
        toast.info(tLabels.uploading);
        return;
      }

      setLoading(true);
      setError(null);
      const finalTags = handleCommitRemainingTag();
      const mediaUrls = getMediaUrls();

      try {
        let result;
        if (isEdit && post?.id) {
          result = await updatePost(post.id, {
            content: content.trim(),
            platforms,
            scheduledAt: newStatus === "scheduled" ? scheduledAt : null,
            status: newStatus,
            location: location.trim() || "",
            tags: finalTags,
            mediaUrls,
          });
        } else {
          result = await createPostAction({
            content: content.trim(),
            platforms,
            scheduledAt: newStatus === "scheduled" ? scheduledAt : null,
            status: newStatus,
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            mediaUrls,
          });
        }

        if (result.success) {
          toast.success(isEdit ? tLabels.postUpdated : tLabels.postCreated);
          onOpenChange(false);
          window.location.reload();
        } else {
          setError(result.error ?? tLabels.errorSaving);
          toast.error(result.error ?? tLabels.errorSaving);
        }
      } catch {
        setError(tLabels.errorSaving);
        toast.error(tLabels.errorSaving);
      } finally {
        setLoading(false);
      }
    },
    [
      content, platforms, scheduledAt, status, location, tags, tagDraft,
      isEdit, post, hasUploading, getMediaUrls, handleCommitRemainingTag,
      onOpenChange, tLabels,
    ]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="max-w-lg rounded-[20px] bg-card/95 backdrop-blur-xl border border-white/10 p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? tLabels.editPost : tLabels.newPost}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Status pills – only in edit mode */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80">
                {tLabels.statusDraft}
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "draft", label: tLabels.statusDraft },
                  { value: "scheduled", label: tLabels.statusScheduled },
                  { value: "published", label: tLabels.statusPublished },
                  { value: "failed", label: tLabels.statusFailed },
                ].map((s) => {
                  const isSelected = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                        isSelected
                          ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                          : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-content" className="text-sm font-medium text-muted-foreground/80">
              {tLabels.content}
            </Label>
            <Textarea
              id="edit-content"
              placeholder={tLabels.contentPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-y bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            />
            <div className="flex justify-end text-xs text-muted-foreground/60">
              <span className={content.length > 280 ? "text-destructive" : ""}>
                {content.length} {tLabels.characterCount}
              </span>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {tLabels.addMedia}
            </Label>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) {
                  const tooLarge = files.some((f) => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(tLabels.fileTooLarge);
                    return;
                  }
                  addMediaFiles(files);
                }
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingMedia(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingMedia(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingMedia(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingMedia(false);
                const files = Array.from(e.dataTransfer.files ?? []);
                if (files.length > 0) {
                  const tooLarge = files.some((f) => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(tLabels.fileTooLarge);
                    return;
                  }
                  addMediaFiles(files);
                }
              }}
              className={cn(
                "group relative w-full rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-left backdrop-blur-md transition-colors hover:bg-white/[0.05]",
                isDraggingMedia && "border-indigo-500/50 bg-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-white/[0.03] backdrop-blur-md">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {tLabels.addMedia}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                    <Film className="h-3.5 w-3.5" />
                    <span>
                      {mediaItems.length}/{MAX_MEDIA_FILES}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.02] backdrop-blur-md"
                  >
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-200/80">
                          {tLabels.uploading}
                        </span>
                      </div>
                    )}
                    {item.kind === "image" ? (
                      <NextImage
                        src={item.previewUrl}
                        alt="Media preview"
                        width={240}
                        height={96}
                        className="h-24 w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <video
                        src={item.previewUrl}
                        className="h-24 w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMediaItem(item.id)}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {tLabels.selectPlatforms}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = platforms.includes(platform.id);
                const Icon = PlatformIconMap[platform.id];
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : "border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
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
            <Label className="text-sm font-medium text-muted-foreground/80">
              Lokace
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={tLabels.locationPlaceholder}
                className="h-10 rounded-xl border-white/10 bg-black/20 pl-10 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {tLabels.addTags}
            </Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 px-3 py-1 text-xs text-indigo-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commitTag(tagDraft);
                }
                if (e.key === "Backspace" && tagDraft.length === 0 && tags.length > 0) {
                  removeTag(tags[tags.length - 1] ?? "");
                }
              }}
              onBlur={() => commitTag(tagDraft)}
              placeholder={tLabels.addTags}
              className="h-10 rounded-xl border-white/10 bg-black/20 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {tLabels.scheduledAt}
            </Label>
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              locale={locale}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-white/5">
          <Button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={!content.trim() || loading}
            variant="outline"
            className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? tLabels.saving : tLabels.saveDraft}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit("scheduled")}
            disabled={!content.trim() || !scheduledAt || loading}
            className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? tLabels.saving : tLabels.schedule}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit("published")}
            disabled={!content.trim() || platforms.length === 0 || loading}
            className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? tLabels.saving : tLabels.publishNow}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
