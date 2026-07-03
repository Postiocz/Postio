"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { updatePost } from "@/lib/actions/posts";
import { publishPost } from "@/lib/actions/publish";
import { publishAdditionalPlatforms } from "@/lib/actions/publish";
import { deleteFromMeta } from "@/lib/actions/publish";
import { ArrowLeft, CheckCircle2, Film, AlertTriangle, Image as ImageIcon, Loader2, MapPin, X, Plus, Trash2, Lock, Send, ExternalLink } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { TagPicker } from "@/components/tag-picker";

const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin", "youtube", "tiktok"];

// Platforms that don't support editing published posts
const NON_EDITABLE_PLATFORMS = ["instagram", "linkedin", "tiktok"];

const MAX_MEDIA_FILES = 10;

interface PostPlatform {
  platform: string;
  status: string;
  external_id: string | null;
  scheduled_at: string | null;
}

export default function EditPostPage() {
  const t = useTranslations("posts");
  const router = useRouter();
  const { locale, id } = useParams() as { locale: string; id: string };
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Platform management state
  const [postPlatforms, setPostPlatforms] = useState<PostPlatform[]>([]);
  const [platformPublishing, setPlatformPublishing] = useState<string | null>(null);
  const [platformDeleting, setPlatformDeleting] = useState<string | null>(null);
  // Snapshot of the original post used to detect "internal metadata" changes
  // (location, inline hashtags, internal organization tags) without re-publishing
  // the post on social networks.
  const [originalPost, setOriginalPost] = useState<{
    content: string;
    location: string;
    tags: string[];
    tagIds: string[];
    status: string;
  } | null>(null);

  const supabase = createClient();
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
  const {
    items: mediaItems,
    addFiles: addMediaFiles,
    removeItem: removeMediaItem,
    loadExistingUrls,
    getMediaUrls,
    hasUploading,
    getInstagramIncompatibleVideos,
  } = useMediaUpload(userId, MAX_MEDIA_FILES, uploadLabels);

  // Instagram video-resolution hard-block. When the post is destined for
  // Instagram and contains a video with shorter side < 640 px, we surface
  // a banner and disable Publish / Schedule (see EditPostDialog for the
  // matching copy and rationale).
  const isInstagramVideoIncompatible = useMemo(() => {
    if (!selectedPlatforms.includes("instagram")) return false;
    return getInstagramIncompatibleVideos().length > 0;
  }, [selectedPlatforms, getInstagramIncompatibleVideos]);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, [supabase]);

  // Load post data
  useEffect(() => {
    (async () => {
      const { data: postData, error: err } = (await supabase
        .from("posts")
        .select("*, post_platforms(platform, status, external_id, scheduled_at), post_tags(tags(id, name, color))")
        .eq("id", id)
        .single()) as {
        data: {
          content: string;
          platforms: string[];
          status: string;
          scheduled_at: string | null;
          location: string | null;
          tags: string[];
          media_urls: string[];
          post_platforms: PostPlatform[] | null;
          post_tags: { tags: { id: string; name: string; color: string } | null }[] | null;
        } | null;
        error: Error | null;
      };

      if (err || !postData) return;

      setContent(postData.content);
      setStatus(postData.status);
      setLocation(postData.location ?? "");
      setTags(postData.tags ?? []);
      setScheduledAt(postData.scheduled_at ?? "");
      // Load existing media URLs from database
      if (postData.media_urls && postData.media_urls.length > 0) {
        loadExistingUrls(postData.media_urls);
      }
      // Load existing internal organization tags
      const existingTagIds = (postData.post_tags ?? [])
        .map((row) => row.tags?.id)
        .filter((t): t is string => typeof t === "string");
      setSelectedTagIds(existingTagIds);
      // Load post_platforms with full details
      setPostPlatforms(postData.post_platforms ?? []);
      // Initialize selectedPlatforms from post.platforms (legacy) or post_platforms
      const platformList = postData.platforms?.length
        ? postData.platforms
        : (postData.post_platforms ?? []).map((p) => p.platform);
      setSelectedPlatforms(platformList);
      // Snapshot for change detection
      setOriginalPost({
        content: postData.content,
        location: postData.location ?? "",
        tags: postData.tags ?? [],
        tagIds: existingTagIds,
        status: postData.status,
      });
      setLoading(false);
    })();
  }, [id, supabase, loadExistingUrls]);

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

  // Detect changes against the original snapshot.
  const isContentChanged = useMemo(() => {
    if (!originalPost) return false;
    return content.trim() !== originalPost.content.trim();
  }, [content, originalPost]);

  const hasMetadataChanges = useMemo(() => {
    if (!originalPost) return false;
    const originalTagIds = [...originalPost.tagIds].sort().join(",");
    const currentTagIds = [...selectedTagIds].sort().join(",");
    const originalLocation = (originalPost.location ?? "").trim();
    const currentLocation = location.trim();
    const originalTags = [...originalPost.tags].sort().join(",");
    const currentTags = [...tags].sort().join(",");
    return (
      originalTagIds !== currentTagIds ||
      originalLocation !== currentLocation ||
      originalTags !== currentTags
    );
  }, [originalPost, selectedTagIds, location, tags]);

  /**
   * Save only the internal metadata of a published post (location, inline hashtags,
   * internal organization tags). Does NOT touch the published content on social
   * networks, status, or scheduled_at.
   */
  const handleSaveMetadata = async () => {
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    setSavingMetadata(true);
    setError(null);
    try {
      const result = await updatePost(id, {
        location: location.trim() || "",
        tags,
        tagIds: selectedTagIds,
      });
      if (result.success) {
        toast.success(t("metadataSaved"));
        // Keep the user on the page – just refresh state via originalPost.
        if (originalPost) {
          setOriginalPost({ ...originalPost, location, tags, tagIds: selectedTagIds });
        }
        router.refresh();
        return;
      }
      setError(result.error ?? t("errorSaving"));
      toast.error(result.error ?? t("errorSaving"));
    } catch {
      setError(t("errorSaving"));
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleSave = async () => {
    if (hasUploading()) {
      toast.info(t("uploading"));
      return;
    }
    // -------------------------------------------------------------------
    // Instagram video-resolution hard-block. Applies to BOTH "published"
    // and "scheduled" – a scheduled post containing an incompatible video
    // would just fail at the scheduled time anyway, so we block early.
    // -------------------------------------------------------------------
    if (isInstagramVideoIncompatible && (status === "published" || status === "scheduled")) {
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

    setSaving(true);
    setError(null);

    try {
      const mediaUrls = getMediaUrls();
      const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);
      if (status === "published") {
        if (selectedPlatforms.length === 0) {
          toast.error("Pro publikování vyber alespoň jednu platformu.");
          return;
        }

        // If only internal metadata changed (no content/media/platforms change),
        // save only the internal metadata and stay on the page – do NOT re-publish
        // to social networks.
        if (!isContentChanged) {
          const saveResult = await updatePost(id, {
            location: location.trim() || "",
            tags: finalTags,
            tagIds: selectedTagIds,
          });
          if (!saveResult.success) {
            setError(saveResult.error ?? t("errorSaving"));
            toast.error(saveResult.error ?? t("errorSaving"));
            return;
          }
          toast.success(t("metadataSaved"));
          if (originalPost) {
            setOriginalPost({ ...originalPost, location, tags: finalTags, tagIds: selectedTagIds });
          }
          router.refresh();
          return;
        }

        const saveResult = await updatePost(id, {
          content: content.trim(),
          platforms: selectedPlatforms,
          scheduledAt: null,
          location: location.trim() || "",
          tags: finalTags,
          tagIds: selectedTagIds,
          mediaUrls,
        });

        if (!saveResult.success) {
          setError(saveResult.error ?? t("errorSaving"));
          return;
        }

        setPublishing(true);
        const publishResult = await publishPost({ postId: id });

        if (publishResult.success) {
          toast.success("Příspěvek byl úspěšně publikován!");
          router.push(`/${locale}/posts`);
          return;
        }

        const msg = publishResult.error ?? "Publikování selhalo.";
        setError(msg);
        toast.error(msg);
        return;
      }

      const result = await updatePost(id, {
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: normalizedScheduledAt,
        status: status as "draft" | "scheduled" | "published",
        location: location.trim() || "",
        tags: finalTags,
        tagIds: selectedTagIds,
        mediaUrls,
      });

      if (result.success) {
        router.push(`/${locale}/posts`);
        return;
      }

      setError(result.error ?? t("errorSaving"));
    } catch {
      setError(t("errorSaving"));
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="relative">
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
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}/posts`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("title")}
          </Link>
        </div>

        <h1 className="text-center text-3xl font-bold">{t("editPost")}</h1>

        <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-8 shadow-2xl space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">{t("status")}</Label>
            <div className="flex flex-wrap gap-2">
              {["draft", "scheduled", "published"].map((s) => {
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all" +
                      (isSelected
                        ? " border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : " border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10")
                    }
                  >
                    {t(s)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium text-muted-foreground/80">
              {t("content")}
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-y bg-black/20 border-white/10 rounded-xl focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-muted-foreground/30"
            />
          </div>

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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground/80">
              {t("selectPlatforms")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all" +
                      (isSelected
                        ? " border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                        : " border-white/5 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:border-white/10")
                    }
                  >
                    {t(platform)}
                  </button>
                );
              })}
            </div>
          </div>

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

          <div className="flex flex-col gap-3 pt-2">
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
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  publishing ||
                  savingMetadata ||
                  !content.trim() ||
                  hasUploading() ||
                  (isInstagramVideoIncompatible && (status === "published" || status === "scheduled"))
                }
                title={isInstagramVideoIncompatible && (status === "published" || status === "scheduled") ? t("instagramVideoTooSmall") : undefined}
                className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
              >
                {saving || publishing || hasUploading() ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving || publishing || hasUploading() ? t("loading") : t("save")}
              </Button>
              <Button
                onClick={handleSaveMetadata}
                disabled={!hasMetadataChanges || savingMetadata || saving || publishing || hasUploading()}
                variant="outline"
                className={
                  hasMetadataChanges
                    ? "rounded-xl border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200"
                    : "rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] opacity-50"
                }
                title={t("saveMetadataTooltip")}
              >
                {savingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingMetadata ? t("loading") : t("saveMetadata")}
              </Button>
            </div>
            {status === "published" && !isContentChanged && hasMetadataChanges && (
              <p className="text-xs text-muted-foreground/60">
                {t("metadataOnlyHint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
