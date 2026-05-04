"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { updatePost } from "@/lib/actions/posts";
import { ArrowLeft, Film, Image as ImageIcon, MapPin, X } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NextImage from "next/image";

const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin"];

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "image" | "video";
};

const MAX_MEDIA_FILES = 10;

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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    return () => {
      for (const item of mediaItems) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [mediaItems]);

  useEffect(() => {
    (async () => {
      const { data: postData, error: err } = (await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single()) as {
        data: { content: string; platforms: string[]; status: string; scheduled_at: string | null; location: string | null; tags: string[]; media_urls: string[] } | null;
        error: Error | null;
      };

      if (err || !postData) return;

      setContent(postData.content);
      setSelectedPlatforms(postData.platforms ?? []);
      setStatus(postData.status);
      setLocation(postData.location ?? "");
      setTags(postData.tags ?? []);
      if (postData.scheduled_at) {
        const d = new Date(postData.scheduled_at);
        setScheduledAt(d.toISOString().slice(0, 16));
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const addMediaFiles = (incoming: File[]) => {
    const usable = incoming.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );

    setMediaItems((prev) => {
      const remainingSlots = Math.max(0, MAX_MEDIA_FILES - prev.length);
      const toAdd = usable.slice(0, remainingSlots);

      if (toAdd.length < usable.length) {
        toast.error(t("maxFilesReached"));
      }

      const created: MediaItem[] = toAdd.map((file) => ({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith("video/") ? "video" : "image",
      }));

      return [...prev, ...created];
    });
  };

  const removeMediaItem = (itemId: string) => {
    setMediaItems((prev) => {
      const item = prev.find((x) => x.id === itemId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== itemId);
    });
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await updatePost(id, {
        content: content.trim(),
        platforms: selectedPlatforms,
        scheduledAt: scheduledAt || null,
        status: status as "draft" | "scheduled" | "published",
        location: location.trim() || "",
        tags,
        mediaUrls: mediaItems.map((m) => m.file.name),
      });

      if (result.success) {
        router.push(`/${locale}/posts`);
      } else {
        setError(result.error ?? t("errorSaving"));
      }
    } catch {
      setError(t("errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="relative">
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
                if (files.length > 0) addMediaFiles(files);
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
                if (files.length > 0) addMediaFiles(files);
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
                    {item.kind === "image" ? (
                      <NextImage
                        src={item.previewUrl}
                        alt={item.file.name}
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
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100"
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
              placeholder={t("addTags")}
              className="h-12 rounded-xl border-white/10 bg-black/20 focus-visible:ring-0 focus-visible:border-indigo-500/50 placeholder:text-muted-foreground/30"
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

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
            >
              {saving ? t("loading") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
