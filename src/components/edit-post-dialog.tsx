"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, Loader2, Film, Image as ImageIcon, AlertTriangle, Info, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createPostAction, updatePost } from "@/lib/actions/posts";
import { publishPost, updateRemotePostAction, publishAdditionalPlatforms } from "@/lib/actions/publish";
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
import { AIAssistantButton } from "@/components/ai-assistant-button";

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

export type PostPlatform = {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  created_at: string;
  updated_at: string;
};

export interface EditPostData {
  id?: string;
  content: string;
  platforms: string[];
  post_platforms?: PostPlatform[];
  scheduled_at: string | null;
  status: string;
  location: string | null;
  tags: string[];
  media_urls: string[];
  published_platforms?: string[];
  external_ids?: Record<string, string> | null;
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
    uploadSuccess: string;
    fileTooLarge: string;
    fileTooLargeImage: string;
    fileTooLargeVideo: string;
    fileDeleted: string;
    invalidFileType: string;
    statusDraft: string;
    statusScheduled: string;
    statusPublished: string;
    statusFailed: string;
    remoteEditSuccess?: string;
    photoChangeNotAllowed?: string;
    updateOnSocials?: string;
    onlyTextUpdatePossible?: string;
    igEditNotSupported?: string;
    cancel?: string;
    publishToSelected?: string;
    additionalPublishSuccess?: string;
  };
  tAi?: {
    aiAssistant: string;
    improveText: string;
    shortenText: string;
    generateTags: string;
    aiThinking: string;
    aiSuccess: string;
    aiError: string;
    aiEmptyContent: string;
  };
}

export function EditPostDialog({
  open,
  onOpenChange,
  post,
  locale,
  tLabels,
  tAi,
}: EditPostDialogProps) {
  const isEdit = !!post?.id;
  const router = useRouter();

  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPublishingAdditional, setIsPublishingAdditional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (userId || !open) return;
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch {
        // silently ignore – user will be fetched when needed
      }
    };
    getUser();
  }, [open, supabase, userId]);

  const uploadLabels = {
    tooManyFiles: tLabels.maxFilesReached,
    uploadSuccess: tLabels.uploadSuccess,
    uploadError: tLabels.uploadError,
    fileDeleted: tLabels.fileDeleted ?? "File deleted",
    invalidFileType: tLabels.invalidFileType ?? "Unsupported file format",
    fileTooLargeImage: tLabels.fileTooLargeImage ?? "File is too large. Max limit for images is 5MB.",
    fileTooLargeVideo: tLabels.fileTooLargeVideo ?? "File is too large. Max limit for videos is 20MB.",
  };
  const {
    items: mediaItems,
    addFiles: addMediaFiles,
    removeItem: removeMediaItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
  } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

  // Detect if the published post is on Instagram
  const isInstagramPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'instagram' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);

  // Detect if the published post is on Facebook (supports remote text editing)
  const isFacebookPublished = useMemo(() => {
    if (!isEdit) return false;
    return (post?.post_platforms || []).some(p => p.platform === 'facebook' && p.status === 'published');
  }, [isEdit, post?.post_platforms]);

  // Detect if media was changed for published posts
  const mediaChanged = useMemo(() => {
    if (!isEdit || post?.status !== "published") return false;
    const originalMedia = post.media_urls ?? [];
    const currentMedia = getMediaUrls();
    return (
      originalMedia.length !== currentMedia.length ||
      originalMedia.some((url, i) => url !== currentMedia[i])
    );
  }, [isEdit, post?.status, post?.media_urls, mediaItems]);

  // Determine which selected platforms are not yet published
  const unpublishedSelectedPlatforms = useMemo(() => {
    const published = (post?.post_platforms || []).filter(p => p.status === 'published').map(p => p.platform);
    return platforms.filter((p) => !published.includes(p));
  }, [platforms, post?.post_platforms]);

  // If any selected platform is unpublished → show "Publish to selected" button
  const canPublishAdditional = unpublishedSelectedPlatforms.length > 0;

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      if (isEdit && post) {
        setContent(post.content);
        // Auto-remove already published platforms from selection state
        // Published platforms are visually locked and should not be in the active selection
        const published = (post.post_platforms || []).filter(p => p.status === 'published').map(p => p.platform);
        const cleanPlatforms = (post.platforms ?? []).filter((p) => !published.includes(p));
        setPlatforms(cleanPlatforms);
        setStatus(post.status);
        setLocation(post.location ?? "");
        setTags(post.tags ?? []);
        setScheduledAt(post.scheduled_at ?? "");
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
    });
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

  const normalizeScheduledAt = useCallback((value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }, []);

  const handleSubmit = useCallback(
    async (newStatus: "draft" | "scheduled") => {
      if (!content.trim()) return;
      if (hasUploading()) {
        toast.info(tLabels.uploading);
        return;
      }

      setLoading(true);
      setError(null);
      const finalTags = handleCommitRemainingTag();
      const mediaUrls = getMediaUrls();
      const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);

      try {
        let result;

        // Remote Edit: if editing a published post, sync text changes to social network
        if (isEdit && post?.id && status === "published") {
          // Instagram does not support editing captions of published posts
          if (isInstagramPublished) {
            const msg = tLabels.igEditNotSupported ?? "Instagram neumožňuje úpravu textu u již zveřejněných příspěvků. Pokud chcete text změnit, musíte příspěvek v Postio smazat a publikovat znovu.";
            setError(msg);
            toast.error(msg);
            setLoading(false);
            return;
          }
          // Check if media was changed — photo/video changes are not allowed for published posts
          const originalMedia = post.media_urls ?? [];
          const currentMedia = mediaUrls;
          const mediaChanged =
            originalMedia.length !== currentMedia.length ||
            originalMedia.some((url, i) => url !== currentMedia[i]);

          if (mediaChanged) {
            toast.error(tLabels.photoChangeNotAllowed ?? "Změna fotky u publikovaného postu není možná. Pro změnu fotky musíte příspěvek publikovat znovu.");
            setLoading(false);
            return;
          }

          result = await updateRemotePostAction({
            postId: post.id,
            newContent: content.trim(),
          });

          if (result.success) {
            toast.success(tLabels.remoteEditSuccess ?? "Text byl upraven v Postio i na sociální síti.");
            onOpenChange(false);
            router.refresh();
            return;
          }

          setError(result.error ?? tLabels.errorSaving);
          toast.error(result.error ?? tLabels.errorSaving);
          setLoading(false);
          return;
        }

        if (isEdit && post?.id) {
          result = await updatePost(post.id, {
            content: content.trim(),
            platforms,
            scheduledAt: normalizedScheduledAt,
            status: newStatus,
            location: location.trim() || "",
            tags: finalTags,
            mediaUrls,
          });
        } else {
          result = await createPostAction({
            content: content.trim(),
            platforms,
            scheduledAt: normalizedScheduledAt,
            status: newStatus,
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            mediaUrls,
          });
        }

        if (result.success) {
          toast.success(isEdit ? tLabels.postUpdated : tLabels.postCreated);
          await router.refresh();
          onOpenChange(false);
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
      normalizeScheduledAt, onOpenChange, tLabels, isInstagramPublished,
    ]
  );

  const handleUpdateOnSocials = async () => {
    if (!content.trim() || !isEdit || !post?.id) return;
    if (hasUploading()) {
      toast.info(tLabels.uploading);
      return;
    }
    if (mediaChanged) {
      toast.error(tLabels.onlyTextUpdatePossible ?? tLabels.photoChangeNotAllowed ?? "U publikovaného postu lze měnit pouze text.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateRemotePostAction({
        postId: post.id,
        newContent: content.trim(),
      });

      if (result.success) {
        toast.success(tLabels.remoteEditSuccess ?? "Text byl upraven v Postio i na sociální síti.");
        await router.refresh();
        onOpenChange(false);
        return;
      }

      setError(result.error ?? tLabels.errorSaving);
      toast.error(result.error ?? tLabels.errorSaving);
    } catch {
      setError(tLabels.errorSaving);
      toast.error(tLabels.errorSaving);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePublishAdditional = async (targetPlatform: string) => {
    if (!isEdit || !post?.id) return;
    if (hasUploading()) {
      toast.info(tLabels.uploading);
      return;
    }

    setIsPublishingAdditional(true);
    setError(null);

    try {
      const result = await publishAdditionalPlatforms({
        postId: post.id,
        platform: targetPlatform,
      });

      if (result.success) {
        console.log("handlePublishAdditional: úspěšně publikováno na", targetPlatform);
        toast.success(tLabels.additionalPublishSuccess ?? `Příspěvek byl publikován na ${targetPlatform}!`);
        await router.refresh();
        onOpenChange(false);
        return;
      }

      setError(result.error ?? tLabels.errorSaving);
      toast.error(result.error ?? tLabels.errorSaving);
    } catch {
      setError(tLabels.errorSaving);
      toast.error(tLabels.errorSaving);
    } finally {
      setIsPublishingAdditional(false);
    }
  };

  const handlePublishNow = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(tLabels.uploading);
      return;
    }

    setPublishing(true);
    setError(null);

    const finalTags = handleCommitRemainingTag();
    const mediaUrls = getMediaUrls();

    try {
        let postId: string | undefined;

        // EDIT FLOW: Save content/media changes to DB before publishing.
        // updatePost strips published_platforms internally – it NEVER touches publish state.
        if (isEdit && post?.id) {
          const saveResult = await updatePost(post.id, {
            content: content.trim(),
            platforms,
            scheduledAt: null,
            location: location.trim() || "",
            tags: finalTags,
            mediaUrls,
          });

          if (!saveResult.success) {
            const msg = saveResult.error ?? tLabels.errorSaving;
            setError(msg);
            toast.error(msg);
            return;
          }
          postId = post.id;
        } else {
          // NEW POST FLOW: Create draft, then publish.
          const createResult = await createPostAction({
            content: content.trim(),
            platforms,
            scheduledAt: null,
            status: "draft",
            location: location.trim() || undefined,
            tags: finalTags.length > 0 ? finalTags : undefined,
            mediaUrls,
          });

          if (!createResult.success || !createResult.data?.id) {
            const msg = createResult.error ?? tLabels.errorSaving;
            setError(msg);
            toast.error(msg);
            return;
          }
          postId = createResult.data.id as string;
        }

        // PUBLISH FLOW: publishPost calls handlePublishSuccess which uses RPC append_published_platform.
        // This is the ONLY place where published_platforms gets modified.
        const publishResult = await publishPost({ postId });

      if (publishResult.success) {
        console.log("handlePublishNow: úspěšně publikováno, publishResult:", publishResult);
        toast.success("Příspěvek byl úspěšně publikován!");
        await router.refresh();
        onOpenChange(false);
        return;
      }

      const msg = publishResult.error ?? "Publikování selhalo.";
      setError(msg);
      toast.error(msg);
    } catch {
      setError("Publikování selhalo.");
      toast.error("Publikování selhalo.");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="max-w-lg rounded-[20px] bg-white/80 dark:bg-card/40 backdrop-blur-xl border border-black/5 dark:border-white/10 p-0 sm:max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
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
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-content" className="text-sm font-medium text-muted-foreground/80">
                {tLabels.content}
              </Label>
              {tAi && (
                <AIAssistantButton
                  content={content}
                  onContentReplace={(text) => setContent(text)}
                  onTagsAdd={(newTags) => {
                    setTags((prev) => {
                      const existing = new Set(prev.map((tag) => tag.toLowerCase()));
                      const added = newTags.filter((tag) => !existing.has(tag.toLowerCase()));
                      return added.length > 0 ? [...prev, ...added] : prev;
                    });
                  }}
                  t={tAi}
                />
              )}
            </div>
            <Textarea
              id="edit-content"
              placeholder={tLabels.contentPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-y rounded-xl transition-all focus:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus:bg-white focus:border-indigo-500/30 dark:focus:bg-black/40 dark:focus:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
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
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: "100%", height: "auto" }}
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

          {/* Warning: media changed for published post */}
          {isEdit && status === "published" && mediaChanged && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{tLabels.onlyTextUpdatePossible ?? "U publikovaného postu lze měnit pouze text. Pro změnu fotky musíte příspěvek smazat a vytvořit znovu."}</span>
            </div>
          )}

          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {tLabels.selectPlatforms}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = platforms.includes(platform.id);
                const isPublished = (post?.post_platforms || []).some(p => p.platform === platform.id && p.status === 'published');
                const Icon = PlatformIconMap[platform.id];
                const platformColor = {
                  instagram: "text-[#E1306C]",
                  facebook: "text-[#1877F2]",
                  twitter: "text-[#1DA1F2]",
                  linkedin: "text-[#0A66C2]",
                  youtube: "text-[#FF0000]",
                  tiktok: "text-[#010101]",
                }[platform.id] ?? "text-muted-foreground";
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => !isPublished && togglePlatform(platform.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                      isPublished
                        ? "border-green-500/30 bg-green-500/10 text-green-400 opacity-60 pointer-events-none"
                        : isSelected
                          ? "border-indigo-500/30 dark:border-indigo-500/50 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                          : cn(
                              "border-black/5 dark:border-white/5 bg-white/60 dark:bg-white/[0.03] text-slate-700 dark:text-muted-foreground hover:bg-white dark:hover:bg-white/[0.06]",
                              "dark:text-muted-foreground",
                            )
                    )}
                  >
                    {Icon && <Icon className={cn("h-3.5 w-3.5", isPublished ? "" : (isSelected ? "" : platformColor))} />}
                    {platform.label}
                    {isPublished && <Check className="h-3 w-3 text-green-500" />}
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
                className="h-10 rounded-xl pl-10 transition-all focus-visible:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus-visible:bg-white focus-visible:border-indigo-500/30 dark:focus-visible:bg-black/40 dark:focus-visible:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
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
              className="h-10 rounded-xl transition-all focus-visible:ring-0 text-slate-900 dark:text-white bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus-visible:bg-white focus-visible:border-indigo-500/30 dark:focus-visible:bg-black/40 dark:focus-visible:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-muted-foreground/30"
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
        <div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-3">
          {isEdit && status === "published" ? (
            <>
              {/* Additional publish buttons – publish to platforms not yet published */}
              {canPublishAdditional && unpublishedSelectedPlatforms.map((p) => {
                const Icon = PlatformIconMap[p];
                const platformLabel = PLATFORMS.find((pl) => pl.id === p)?.label ?? p;
                return (
                  <Button
                    key={p}
                    type="button"
                    onClick={() => handlePublishAdditional(p)}
                    disabled={isPublishingAdditional || hasUploading()}
                    className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishingAdditional && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {tLabels.publishToSelected ?? "Publikovat"} na {platformLabel}
                  </Button>
                );
              })}

              {/* Instagram edit not supported banner */}
              {isInstagramPublished && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200/80">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{tLabels.igEditNotSupported ?? "Instagram neumožňuje úpravu textu u již zveřejněných příspěvků. Pokud chcete text změnit, musíte příspěvek v Postio smazat a publikovat znovu."}</span>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => handleClose()}
                  variant="outline"
                  className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                >
                  {tLabels.cancel ?? "Zrušit"}
                </Button>
                {isFacebookPublished && (
                  <Button
                    type="button"
                    onClick={handleUpdateOnSocials}
                    disabled={!content.trim() || isUpdating || mediaChanged || hasUploading()}
                    className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdating ? tLabels.saving : (tLabels.updateOnSocials ?? "Aktualizovat na sítích")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => handleSubmit("draft")}
                disabled={!content.trim() || loading || publishing}
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? tLabels.saving : tLabels.saveDraft}
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit("scheduled")}
                disabled={!content.trim() || !scheduledAt || platforms.length === 0 || loading || publishing}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? tLabels.saving : tLabels.schedule}
              </Button>
              <Button
                type="button"
                onClick={handlePublishNow}
                disabled={!content.trim() || platforms.length === 0 || loading || publishing}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {publishing ? tLabels.saving : tLabels.publishNow}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
