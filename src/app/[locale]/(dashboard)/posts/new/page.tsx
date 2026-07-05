"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPostAction } from "@/lib/actions/posts";
import { publishPost } from "@/lib/actions/publish";
import { getNextAvailableQueueSlot } from "@/lib/actions/queue";
import { ArrowLeft, Calendar, CheckCircle2, Film, AlertTriangle, Image as ImageIcon, Loader2, ListOrdered, MapPin, X } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS,
  isTikTokSandboxPrivateOnlyError,
  TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE,
} from "@/lib/tiktok-publish-errors";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { TagPicker } from "@/components/tag-picker";

const PLATFORMS = [
  { id: "instagram", labelCs: "Instagram", labelEn: "Instagram", labelUk: "Instagram" },
  { id: "facebook", labelCs: "Facebook", labelEn: "Facebook", labelUk: "Facebook" },
  { id: "twitter", labelCs: "Twitter/X", labelEn: "Twitter/X", labelUk: "Twitter/X" },
  { id: "linkedin", labelCs: "LinkedIn", labelEn: "LinkedIn", labelUk: "LinkedIn" },
  { id: "youtube", labelCs: "YouTube", labelEn: "YouTube", labelUk: "YouTube" },
  { id: "tiktok", labelCs: "TikTok", labelEn: "TikTok", labelUk: "TikTok" },
];

const MAX_MEDIA_FILES = 10;

function resolvePublishErrorMessage(params: {
  error?: string;
  errorCode?: string;
  t: (key: string) => string;
}): string {
  const { error, errorCode, t } = params;

  if (
    errorCode === TIKTOK_SANDBOX_PRIVATE_ONLY_ERROR_CODE ||
    isTikTokSandboxPrivateOnlyError(error)
  ) {
    return (
      t("tiktokSandboxPrivateOnlyError") ??
      DEFAULT_TIKTOK_SANDBOX_PRIVATE_ONLY_MESSAGE_CS
    );
  }

  return error ?? "Publikování selhalo.";
}

export default function NewPostPage() {
  const t = useTranslations("posts");
   const router = useRouter();
  const { locale } = useParams();
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // ---------------------------------------------------------------------
  // Template prefill (?template=<id>)
  // ---------------------------------------------------------------------
  // When the user clicks a template card on /templates, we land here with
  // the template id in the URL. We fetch that template's content from the
  // DB (RLS ensures we only get our own templates) and prefill the editor.
  // The `templateAppliedRef` guard makes sure the prefill runs only once –
  // otherwise re-renders caused by typing would keep clobbering the user's
  // edits with the original template content.
  const templateAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId || !userId) return;
    if (templateAppliedRef.current === templateId) return;

    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("templates")
        .select("id, name, content")
        .eq("id", templateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError || !data) {
        templateAppliedRef.current = templateId;
        toast.error(t("templateLoadError"));
        return;
      }

      templateAppliedRef.current = templateId;
      setContent(data.content);
      toast.success(t("templateApplied", { name: data.name }));
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, userId, t]);

  const uploadLabels = {
    tooManyFiles: t("tooManyFiles"),
    uploadSuccess: t("uploadSuccess"),
    uploadError: t("uploadError"),
    fileDeleted: t("fileDeleted"),
    invalidFileType: t("invalidFileType"),
    // `unsupportedFormat` is an ICU message with the `{type}` placeholder – it
    // must be called as a function (per next-intl rules) so the offending
    // MIME type is substituted correctly.
    unsupportedFormat: (values: { type: string }) => t("unsupportedFormat", values),
    videoTooLarge: t("videoTooLarge"),
    videoLowResolution: t("videoLowResolution"),
    // These two are required by the MediaUploadLabels type but are only
    // surfaced by the form UI, not the upload hook itself – the hook never
    // calls them. We pass them so the uploadLabels object satisfies the
    // type contract.
    instagramVideoTooSmall: t("instagramVideoTooSmall"),
    instagramVideoTooSmallHint: t("instagramVideoTooSmallHint"),
    fileTooLargeImage: t("fileTooLargeImage"),
    fileTooLargeVideo: t("fileTooLargeVideo"),
    optimizingImage: t("optimizingImage"),
    fileOptimized: t("fileOptimized"),
    compressionError: t("compressionError"),
  };
  const { items: mediaItems, addFiles: addMediaFiles, removeItem: removeMediaItem, getMediaUrls, hasUploading, getInstagramIncompatibleVideos } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

  // First uploaded image URL for AI Vision (only ready uploads have server-accessible URLs)
  const firstImageUrl = useMemo(() => {
    const firstImage = mediaItems.find((item) => item.kind === "image" && item.status === "ready" && item.url);
    return firstImage?.url ?? null;
  }, [mediaItems]);

  // Instagram video-resolution hard-block. When the post is destined for
  // Instagram and contains a video with shorter side < 640 px, we surface
  // a banner and disable Publish / Schedule (see EditPostDialog for the
  // matching copy and rationale).
  const isInstagramVideoIncompatible = useMemo(() => {
    if (!selectedPlatforms.includes("instagram")) return false;
    return getInstagramIncompatibleVideos().length > 0;
  }, [selectedPlatforms, getInstagramIncompatibleVideos]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const commitTag = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
    const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
    if (!normalized) return;

    const tag = `#${normalized}`;
    setTags((prev) => {
      const exists = prev.some((t0) => t0.toLowerCase() === tag.toLowerCase());
      return exists ? prev : [...prev, tag];
    });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t0) => t0 !== tag));
  };

  const normalizeScheduledAt = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block. Applies to "scheduled" only –
    // a plain draft can still be saved so the user can keep working on
    // other parts of the post and fix the media later.
    // -------------------------------------------------------------------
    if (isInstagramVideoIncompatible && status === "scheduled") {
      const msg = t("instagramVideoTooSmall");
      setError(msg);
      toast.error(msg);
      return;
    }

    // Commit remaining tag draft before saving
    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");

    setLoading(true);
    setError(null);

    try {
      const mediaUrls = getMediaUrls();
      const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);
      const result = await createPostAction({
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: normalizedScheduledAt,
        status,
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
      });

      if (result.success) {
        toast.success(t("postCreated"));
        router.push(`/${locale}/posts`);
      } else {
        setError(result.error ?? t("errorSaving"));
        toast.error(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block. If the post is destined for
    // Instagram but contains a video whose shorter side is below 640 px,
    // we refuse to even attempt publishing – Meta's API would just fail
    // with error_subcode 2207082 and the user would see a cryptic error.
    // -------------------------------------------------------------------
    if (isInstagramVideoIncompatible) {
      const msg = t("instagramVideoTooSmall");
      setError(msg);
      toast.error(msg);
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Pro publikování vyber alespoň jednu platformu.");
      return;
    }

    let finalTags = [...tags];
    if (tagDraft.trim()) {
      const cleaned = tagDraft.trim();
      const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
      const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
      if (normalized) {
        const tag = `#${normalized}`;
        const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
        if (!exists) finalTags = [...finalTags, tag];
      }
    }
    setTagDraft("");

    setPublishing(true);
    setError(null);

    try {
      const mediaUrls = getMediaUrls();
      const createResult = await createPostAction({
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: null,
        status: "draft",
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
      });

      if (!createResult.success || !createResult.data?.id) {
        const msg = createResult.error ?? t("errorSaving");
        setError(msg);
        toast.error(msg);
        return;
      }

      const postId = createResult.data.id as string;
      const publishResult = await publishPost({ postId });

      if (publishResult.success) {
        toast.success("Příspěvek byl úspěšně publikován!");
        router.push(`/${locale}/posts`);
        return;
      }

      const msg = resolvePublishErrorMessage({
        error: publishResult.error,
        errorCode: publishResult.errorCode,
        t,
      });
      setError(msg);
      toast.error(msg);
    } catch {
      setError("Publikování selhalo.");
      toast.error("Publikování selhalo.");
    } finally {
      setPublishing(false);
    }
  };

  /**
   * Queue a post to the next available slot from the user's posting schedule.
   * Calls getNextAvailableQueueSlot server action, then submits as "scheduled".
   */
  const handleQueueToSchedule = async () => {
    if (!content.trim()) return;
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    if (isInstagramVideoIncompatible) {
      const msg = t("instagramVideoTooSmall");
      setError(msg);
      toast.error(msg);
      return;
    }

    setQueuing(true);
    setError(null);

    try {
      const slotResult = await getNextAvailableQueueSlot();
      if (!slotResult.success || !slotResult.scheduledAt) {
        const msg = slotResult.error ?? t("errorSaving");
        setError(msg);
        toast.error(msg);
        return;
      }

      // Format the queued date/time for the success toast
      const queuedDate = new Date(slotResult.scheduledAt);
      const formattedDate = queuedDate.toLocaleString(
        typeof locale === "string" && locale !== "en" ? `${locale}-${locale.toUpperCase()}` : "en-US",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      );

      // Commit remaining tag draft before saving
      let finalTags = [...tags];
      if (tagDraft.trim()) {
        const cleaned = tagDraft.trim();
        const core = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
        const normalized = core.replace(/[^\p{L}\p{N}_-]+/gu, "");
        if (normalized) {
          const tag = `#${normalized}`;
          const exists = finalTags.some((t0) => t0.toLowerCase() === tag.toLowerCase());
          if (!exists) finalTags = [...finalTags, tag];
        }
      }
      setTagDraft("");

      const mediaUrls = getMediaUrls();
      const result = await createPostAction({
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: slotResult.scheduledAt,
        status: "scheduled",
        location: location.trim() || undefined,
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
      });

      if (result.success) {
        toast.success(`Příspěvek byl zařazen do fronty na ${formattedDate}`);
        router.push(`/${locale}/posts`);
      } else {
        setError(result.error ?? t("errorSaving"));
        toast.error(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
      toast.error(t("errorSaving"));
    } finally {
      setQueuing(false);
    }
  };

  const charCount = content.length;

  return (
    <div className="relative">
      {/* Background grid & glow effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='black' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M24 0v24H0' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl space-y-8">
        {/* Top bar: Logo + Back */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/posts`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("title")}
          </Link>
        </div>

        <h1 className="text-center text-3xl font-bold">{t("newPost")}</h1>

        {/* Glass form container */}
        <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content" className="text-sm font-medium text-muted-foreground/80">
                {t("content")}
              </Label>
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
                imageUrl={firstImageUrl}
              />
            </div>
            <Textarea
              id="content"
              placeholder={t("contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-y bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span />
              <span className={charCount > 280 ? "text-destructive" : ""}>
                {charCount} {t("characterCount")}
              </span>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground/80">{t("mediaFiles")}</Label>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) {
                  const tooLarge = files.some(f => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(t("fileTooLarge"));
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
                  const tooLarge = files.some(f => f.size > 50 * 1024 * 1024);
                  if (tooLarge) {
                    toast.error(t("fileTooLarge"));
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
                  <div className="text-sm font-medium text-foreground">{t("addMedia")}</div>
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
                    {/* Image optimization overlay */}
                    {item.status === "optimizing" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        <span className="text-[10px] font-medium text-purple-200/80">{t("optimizingImage")}</span>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-200/80">{t("uploading")}</span>
                      </div>
                    )}

                    {/* Upload success indicator */}
                    {item.status === "ready" && (
                      <div className="absolute left-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/80 backdrop-blur-md">
                        <CheckCircle2 className="h-4 w-4 text-white" />
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

          {/* Platform selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("selectPlatforms")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const label =
                  platform.id === "twitter"
                    ? t("twitter")
                    : platform.id === "linkedin"
                      ? t("linkedin")
                      : platform.id === "instagram"
                        ? t("instagram")
                      : platform.id === "youtube"
                        ? t("youtube")
                      : platform.id === "tiktok"
                        ? t("tiktok")
                        : t("facebook");
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all" +
                      (isSelected
                        ? " border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : " border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10")
                    }
                  >
                    {label}
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
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="h-12 rounded-xl border-white/10 bg-black/20 pl-10 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">{t("addTags")}</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 px-3 py-1 text-sm text-indigo-100 shadow-[0_0_16px_rgba(99,102,241,0.15)]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 hover:bg-black/45"
                      aria-label="Remove tag"
                    >
                      <X className="h-3.5 w-3.5" />
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
              placeholder={t("addTags")}
              className="h-12 rounded-xl border-white/10 bg-black/20 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Internal organization tags (Nastavení → Štítky) – interní, neodesílá se na sítě */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("internalTags")}
            </Label>
            <TagPicker
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              t={{
                placeholder: t("internalTagsPlaceholder"),
                createTag: t("createTag"),
                noTags: t("noInternalTags"),
                selectColor: t("selectColor"),
                add: t("add"),
                cancel: t("cancel"),
              }}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledAt" className="text-sm font-medium text-muted-foreground/80">
              {t("scheduledAt")}
            </Label>
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              locale={typeof locale === "string" ? locale : "en"}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {/* Instagram video-resolution hard-block banner. */}
            {isInstagramVideoIncompatible && (
              <div
                className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200/90"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div className="space-y-0.5">
                  <p className="font-medium">{t("instagramVideoTooSmall")}</p>
                  <p className="text-xs text-rose-200/70">{t("instagramVideoTooSmallHint")}</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleSubmit("draft")}
                disabled={!content.trim() || loading || publishing || hasUploading()}
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              >
                {(loading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(loading || hasUploading()) ? t("saving") : t("saveDraft")}
              </Button>
              <Button
                onClick={handleQueueToSchedule}
                disabled={!content.trim() || selectedPlatforms.length === 0 || loading || publishing || queuing || hasUploading() || isInstagramVideoIncompatible}
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                variant="outline"
                className="rounded-xl border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
              >
                {queuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-2 h-4 w-4" />}
                {queuing ? t("queueLoading") : t("addToQueue")}
              </Button>
              <Button
                onClick={() => handleSubmit("scheduled")}
                disabled={!content.trim() || !scheduledAt || loading || publishing || hasUploading() || isInstagramVideoIncompatible}
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {(loading || hasUploading()) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                {(loading || hasUploading()) ? t("saving") : t("schedule")}
              </Button>
              <Button
                onClick={handlePublishNow}
                disabled={!content.trim() || selectedPlatforms.length === 0 || loading || publishing || hasUploading() || isInstagramVideoIncompatible}
                title={isInstagramVideoIncompatible ? t("instagramVideoTooSmall") : undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {(publishing || loading || hasUploading()) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(publishing || loading || hasUploading()) ? t("saving") : t("publishNow")}
              </Button>
            </div>
            {/* Explain why buttons might be disabled when only internal tags were set. */}
            {(!content.trim() || selectedPlatforms.length === 0) && (
              <p className="text-xs text-muted-foreground/60">
                {t("newPostHint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
