"use client";

/* eslint-disable prefer-const */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Edit, Clock, FileText, Play, RotateCcw, AlertTriangle, Check, X, Eye, CheckSquare, Square } from "lucide-react";
import {
  Instagram,
  Facebook,
  Linkedin,
  XIcon,
  Youtube,
  TikTok,
} from "@/components/ui/social-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePost, resetPostStatus, smartDeletePost } from "@/lib/actions/posts";
import { deleteFromMeta } from "@/lib/actions/publish";
import { EditPostDialog } from "@/components/edit-post-dialog";
import { DeletePostDialog } from "@/components/dashboard/delete-post-dialog";
import { SmartDeleteDialog, type AutoDeleteOption } from "@/components/dashboard/smart-delete-dialog";
import { PreviewDialog } from "@/components/preview-dialog";
import { MediaPreviewDialog } from "@/components/media-preview-dialog";
import { toast } from "sonner";
import type { PostStatus, PlatformStatus } from "@/lib/types";

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "bg-gray-100 text-muted-foreground border border-gray-200 dark:bg-white/10 dark:border-white/10",
  scheduled: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
  publishing: "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  failed: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
  removed_externally: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
  archived: "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
};

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: XIcon,
  x: XIcon,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: TikTok,
};

export type PostPlatform = {
  id: string;
  post_id: string;
  platform: string;
  status: PlatformStatus;
  /** The specific social_accounts row this platform row belongs to.
   *  Enables targeting a single account when a post is published to
   *  multiple accounts of the same platform (e.g. 2× Facebook Page). */
  account_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  publish_error: string | null;
  /** Timestamp when the user archived (soft-deleted) this platform row from Postio. NULL for active rows. */
  archived_at?: string | null;
  /** Why the row was archived. Common values: user_archived_from_app, auto_cleanup. */
  archive_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type PostListItem = {
  id: string;
  content: string;
  status: PostStatus;
  platforms: string[];
  post_platforms?: PostPlatform[];
  scheduled_at: string | null;
  created_at: string;
  location: string | null;
  /** Inline hashtags published as part of the content (e.g. #socialmedia). */
  tags: string[];
  /** Internal organization tags attached via post_tags. */
  post_tags?: { id: string; name: string; color: string }[];
  media_urls: string[];
  published_platforms?: string[];
  external_ids?: Record<string, string> | null;
};

function toLocaleTag(locale: string) {
  if (locale === "cs") return "cs-CZ";
  if (locale === "uk") return "uk-UA";
  return "en-US";
}

export function PostCard({
  post,
  locale,
  onDeleted,
  animationDelay = 0,
  isSelected = false,
  onSelectChange,
}: {
  post: PostListItem;
  locale: string;
  onDeleted?: (id: string) => void;
  animationDelay?: number;
  /** Whether this post is selected for bulk actions (#10). */
  isSelected?: boolean;
  /** Callback when the user toggles selection for this post. */
  onSelectChange?: (id: string, checked: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [smartDeleteOpen, setSmartDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);
  // #13 — Content expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const t = useTranslations("posts");
  // next-intl's parameterized t() can return undefined; this helper always returns string
  const tv = (key: string, params?: Record<string, string | number | Date>, fallback = ""): string => t(key, params) ?? fallback;

  const statusLabels: Record<string, string> = {
    draft: tv("statusDraft", {}, "draft"),
    scheduled: tv("statusScheduled", {}, "scheduled"),
    published: tv("statusPublished", {}, "published"),
    failed: tv("statusFailed", {}, "failed"),
    removed_externally: tv("statusRemovedExternally", {}, "removed_externally"),
    archived: tv("statusArchived", {}, "archived"),
  };

  const statusLabel = statusLabels[post.status] ?? post.status;
  const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

  const handleDeleteConfirm = async (selectedAccountIds: string[], deleteFromApp: boolean) => {
    setIsDeleting(true);
    try {
      const isPublished = (post.post_platforms || []).some(p => p.status === 'published');

      if (isPublished) {
        let deletedCount = 0;
        let cannotDeletePlatforms: string[] = [];

        // Delete from each selected account. Per-platform behaviour:
        // - Facebook / YouTube – real API DELETE (or "object not found"
        //   treated as success) + reset the row to `status="draft"` in Postio.
        // - Instagram – NO API DELETE (Graph API doesn't support it).
        //   `deleteFromMeta` archives the Instagram row to `status="archived"`
        //   and returns `success: true, cannotDeleteViaApi: true`. The user
        //   gets a "smazat ručně" reminder toast.
        // - LinkedIn – NO API call. `deleteFromMeta` archives the LinkedIn row
        //   to `status="archived"` (with `external_id` cleared) and returns
        //   `success: true, cannotDeleteViaApi: true`.
        // Targeting uses `accountId` so two accounts of the same platform
        // (e.g. 2× Facebook Page) are resolved to the correct row.
        for (const accountId of selectedAccountIds) {
          const platform = (post.post_platforms || []).find(p => p.account_id === accountId)?.platform ?? "";
          const result = await deleteFromMeta({ postId: post.id, accountId });
          if (result.success && result.cannotDeleteViaApi) {
            // Platform was archived in Postio but NOT deleted via API
            // (Instagram / LinkedIn flow). Count it AND show reminder toast.
            deletedCount++;
            cannotDeletePlatforms.push(platform);
          } else if (result.success) {
            // Platform was successfully deleted via API (Facebook / YouTube).
            deletedCount++;
          } else if (result.cannotDeleteViaApi) {
            // Unexpected: API not supported but also not archived.
            // Still show the info toast so the user knows.
            cannotDeletePlatforms.push(platform);
          } else {
            // Unexpected error
            toast.error(result.error || tv("toastDeleteFailedPlatform", { platform: platform.charAt(0).toUpperCase() + platform.slice(1) }, `Deletion from ${platform} failed.`));
          }
        }

        // The user already saw the API-warning overlay in DeletePostDialog
        // before confirming, so we don't repeat the info toast here.
        // Just proceed to post-action toasts below.

        // Delete from Postio app if requested.
        //
        // Special case: if LinkedIn or Instagram is among the selected
        // accounts, the post must NOT be hard-deleted from Postio. The whole
        // point of this flow is to keep the PostCard visible with a greyed-out
        // icon – a permanent reminder that the post was once published on that
        // platform. `deleteFromMeta` has already flipped those rows to
        // `status="archived"` and cleared `external_id`, so the icons will
        // render grey (no green check, no orange triangle, no red X).
        const selectedPlatforms = selectedAccountIds
          .map(id => (post.post_platforms || []).find(p => p.account_id === id)?.platform)
          .filter((p): p is string => Boolean(p));
        const hasArchivedPlatform = selectedPlatforms.includes("linkedin") || selectedPlatforms.includes("instagram");
        if (deleteFromApp && hasArchivedPlatform) {
          setDeleteOpen(false);
          router.refresh();
          if (cannotDeletePlatforms.length > 0) {
            const platformsList = cannotDeletePlatforms
              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
              .join(", ");
            toast.success(
              tv("toastArchivedReminder", { platforms: platformsList }, `Post stays in Postio with greyed-out icons for {platforms} – delete manually on those platforms.`),
              { duration: 10000 },
            );
          } else if (deletedCount > 0) {
            toast.success(
              tv("toastDeletedFromPlatforms", { count: deletedCount }, `Post was removed from ${deletedCount} platform(s).`),
              { duration: 10000 },
            );
          }
          return;
        }

        if (deleteFromApp) {
          const result = await deletePost(post.id);
          if (result.success) {
            setDeleteOpen(false);
            onDeleted?.(post.id);
            if (cannotDeletePlatforms.length === 0) {
              toast.success(t("toastDeleteSuccess"));
            } else {
              toast.success(t("toastDeleteFromAppSuccess"));
            }
            return;
          } else {
            toast.error(tv("toastDeleteFailed", { error: String(result.error ?? "Unknown error") }, `Deletion failed: ${result.error}`));
          }
        } else if (deletedCount > 0) {
          toast.success(tv("toastDeletedFromPlatforms", { count: deletedCount }, `Post was removed from ${deletedCount} platform(s).`));
          router.refresh();
          setDeleteOpen(false);
        } else if (cannotDeletePlatforms.length > 0) {
          // All platforms don't support API deletion – just close dialog.
          // Posts still exist on platforms. Info toasts already shown above.
          setDeleteOpen(false);
        }
      } else {
        // Klasické smazání (draft, scheduled, failed, removed_externally)
        const result = await deletePost(post.id);
        if (result.success) {
          setDeleteOpen(false);
          onDeleted?.(post.id);
          toast.success(t("toastDeleteSuccess"));
          return;
        } else {
          toast.error(result.error || t("toastRemoveUnexpectedError"));
        }
      }
    } catch (e) {
      console.error("Error deleting post:", e);
      toast.error(t("toastRemoveUnexpectedError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSmartDelete = async (mode: "keep_as_draft" | "delete_from_app", _autoDelete: AutoDeleteOption) => {
    setIsDeleting(true);
    try {
      const result = await smartDeletePost(post.id, mode);
      if (result.success) {
        setSmartDeleteOpen(false);
        if (mode === "keep_as_draft") {
          toast.success(t("toastKeptAsDraft"));
          router.refresh();
        } else {
          onDeleted?.(post.id);
          toast.success(t("toastPermanentlyDeleted"));
        }
      } else {
        toast.error(result.error || t("toastSmartDeleteError"));
      }
    } catch (e) {
      console.error("Smart delete error:", e);
      toast.error(t("toastSmartDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRepublish = async () => {
    setIsRepublishing(true);
    const result = await resetPostStatus(post.id);
    if (result.success) {
      router.refresh();
      return;
    }
    setIsRepublishing(false);
  };

  const localeTag = toLocaleTag(locale);
  const createdDate = new Date(post.created_at).toLocaleDateString(localeTag);
  const scheduledTime = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })
    : "—";

  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const primaryMedia = hasMedia ? post.media_urls[0] : null;
  const isVideo = primaryMedia ? /\.(mp4|mov)(\?.*)?$/i.test(primaryMedia) : false;

  return (
    <>
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.26, ease: "easeOut", delay: animationDelay }}
      className={cn(
        "relative group bg-white/80 dark:bg-card/40 backdrop-blur-md border rounded-[20px] p-5 mb-6 transition-all hover:border-indigo-500/30 dark:hover:border-indigo-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-2xl",
        isSelected ? "border-indigo-500/50 dark:border-indigo-500/40 ring-1 ring-indigo-500/20" : "border-black/[0.08] dark:border-white/[0.06]",
      )}
    >
      {/* Action buttons – top right (checkbox integrated here on hover) */}
      <div className="absolute top-5 right-5 flex gap-1 z-[50] sm:opacity-0 group-hover:sm:opacity-100 transition-opacity">
        {/* Bulk selection checkbox — inline with action buttons (#10) */}
        {onSelectChange && (
          <button
            type="button"
            onClick={() => onSelectChange(post.id, !isSelected)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 bg-white/60 dark:bg-white/5 backdrop-blur-sm border-black/[0.06] dark:border-white/10"
            style={{
              borderColor: isSelected ? "rgb(99 102 241 / 0.5)" : undefined,
              backgroundColor: isSelected ? "rgb(99 102 241 / 0.1)" : undefined,
            }}
            title={isSelected ? t("deselect") ?? "Deselect" : t("select") ?? "Select"}
          >
            {isSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={3} />
            ) : (
              <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 relative z-[50] cursor-pointer bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-black/[0.06] dark:border-white/10"
          title={tv("editPost", {}, "Edit")}
          onClick={() => setEditOpen(true)}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        {/* Preview (Eye) button – opens standalone preview dialog */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 relative z-[50] cursor-pointer bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-black/[0.06] dark:border-white/10"
          title={t("previewTitle")}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {post.status === "removed_externally" && (
          <>
            {/* Smart delete – orange trash for removed_externally posts */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 relative z-[50] cursor-pointer bg-orange-50 dark:bg-orange-500/10 backdrop-blur-sm border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-500/20"
              onClick={() => setSmartDeleteOpen(true)}
              disabled={isDeleting}
              title={t("smartDeleteTitle")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {/* Republish button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 relative z-[50] cursor-pointer bg-orange-50 dark:bg-orange-500/10 backdrop-blur-sm border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-500/20"
              onClick={handleRepublish}
              disabled={isRepublishing}
              title={tv("republish", {}, "Republish")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {/* Regular delete button – hidden for removed_externally */}
        {post.status !== "removed_externally" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 relative z-[50] cursor-pointer bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-black/[0.06] dark:border-white/10 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
            title={tv("deleteConfirmTitle", {}, "Delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* Media Preview – left on desktop, top on mobile (#12: clickable lightbox) */}
        {hasMedia && primaryMedia && (
          <div className="relative sm:w-48 sm:min-w-48 sm:max-w-48 w-full shrink-0">
            <div
              className="relative overflow-hidden rounded-xl border border-white/10 dark:border-white/10 aspect-video sm:aspect-square sm:sticky sm:top-0 cursor-pointer hover:ring-2 hover:ring-indigo-500/30 transition-all"
              onClick={() => setMediaPreviewOpen(true)}
            >
              {isVideo ? (
                <video
                  src={primaryMedia}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                />
              ) : (
                <img
                  src={primaryMedia}
                  alt="Post media preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/20">
                    <Play className="h-5 w-5 text-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>
            {post.media_urls.length > 1 && (
              <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white border border-white/10">
                +{post.media_urls.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Content – right on desktop, bottom on mobile */}
        <div className="flex flex-col flex-1 min-w-0 relative">
          {/* Header: platform icons + status */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {/* Zobrazujeme platformy z post_platforms */}
              {(post.post_platforms || []).map((p) => {
                const Icon = platformIcons[p.platform.toLowerCase()] ?? FileText;
                const isPublished = p.status === "published";
                const isFailed = p.status === "failed";
                const isRemovedExternally = p.status === "removed_externally";
                return (
                  <div
                    key={p.id || p.platform}
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full border shadow-sm shrink-0",
                      isPublished ? "bg-white dark:bg-white/[0.03] border-emerald-200 dark:border-emerald-500/30" :
                      isFailed ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" :
                      isRemovedExternally ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30" :
                      "bg-white/50 dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-60"
                    )}
                    title={`Status: ${p.status}`}
                  >
                    <Icon className={cn("h-4 w-4", isPublished ? "text-emerald-600 dark:text-emerald-400" : isFailed ? "text-red-600 dark:text-red-400" : isRemovedExternally ? "text-orange-600 dark:text-orange-400" : "text-foreground/80")} />
                    {isPublished && (
                      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-card">
                        <Check className="h-2 w-2 text-white" strokeWidth={4} />
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 border-2 border-white dark:border-card">
                        <X className="h-2 w-2 text-white" strokeWidth={4} />
                      </div>
                    )}
                    {isRemovedExternally && (
                      <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 border-2 border-white dark:border-card">
                        <AlertTriangle className="h-2 w-2 text-white" strokeWidth={4} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs ${statusStyle}`}>
              {statusLabel}
            </Badge>
          </div>

          {/* Post content – text with line clamp and expand/collapse (#13) */}
          <div className="mb-3">
            <div
              className={cn(
                "text-base text-foreground/90 whitespace-pre-line leading-relaxed",
                isExpanded ? "" : "line-clamp-3"
              )}
            >
              {post.content}
            </div>
            {/* Show expand/collapse button only if content is long enough to be clamped */}
            {post.content.split("\n").length > 3 || post.content.length > 180 ? (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors"
              >
                {isExpanded ? tv("showLess", {}, "Zobrazit méně") : tv("showMore", {}, "Zobrazit více")}
              </button>
            ) : null}
          </div>

          {/* Internal organization tags (Nastavení → Štítky) – interní, neodesílá se na sítě */}
          {post.post_tags && post.post_tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {post.post_tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}1A`,
                    color: tag.color,
                    border: `1px solid ${tag.color}33`,
                  }}
                  title="Interní štítek – organizace v aplikaci"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Removed externally warning */}
          {post.status === "removed_externally" && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {tv("removedExternallyMsg", { __platform__: (post.post_platforms?.find(p => p.status === 'removed_externally')?.platform ?? "platform") })}
                </span>
                {post.post_platforms?.find(p => p.status === 'removed_externally')?.updated_at && (
                  <span className="text-[11px] text-orange-600/70 dark:text-orange-400/70">
                    {new Date(post.post_platforms.find(p => p.status === 'removed_externally')!.updated_at).toLocaleDateString(localeTag, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="text-[11px] text-orange-600/60 dark:text-orange-400/60 mt-1">
                  {t("removedExternallyBannerDesc")}
                </span>
              </div>
            </div>
          )}

          {/* Footer: date + scheduled time */}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/50 border-t border-gray-200 dark:border-white/5 pt-3">
            <span>{createdDate}</span>
            {post.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tv("scheduledAt", {}, "Published at")}: {scheduledTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>

    <EditPostDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      post={{
        id: post.id,
        content: post.content,
        platforms: post.platforms ?? [],
        post_platforms: post.post_platforms ?? [],
        scheduled_at: post.scheduled_at,
        status: post.status,
        location: post.location ?? null,
        tags: post.tags ?? [],
        post_tags: post.post_tags ?? [],
        media_urls: post.media_urls ?? [],
      }}
      locale={locale}
    />

    <DeletePostDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      post={{
        id: post.id,
        status: post.status,
        post_platforms: post.post_platforms ?? [],
      }}
      onConfirm={handleDeleteConfirm}
      isDeleting={isDeleting}
    />

    <SmartDeleteDialog
      open={smartDeleteOpen}
      onOpenChange={setSmartDeleteOpen}
      onConfirm={handleSmartDelete}
      isDeleting={isDeleting}
    />

    <PreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      post={{
        id: post.id,
        content: post.content,
        platforms: post.platforms ?? [],
        post_platforms: post.post_platforms ?? [],
        scheduled_at: post.scheduled_at,
        status: post.status,
        location: post.location ?? null,
        tags: post.tags ?? [],
        media_urls: post.media_urls ?? [],
      }}
    />

    {/* #12 — Media lightbox: click thumbnail to view all media fullscreen */}
    <MediaPreviewDialog
      open={mediaPreviewOpen}
      onOpenChange={setMediaPreviewOpen}
      mediaUrls={post.media_urls ?? []}
    />
    </>
  );
}

export function PostsList({
  posts,
  locale,
  onDeleted,
  selectedIds = new Set<string>(),
  onToggleSelect,
}: {
  posts: PostListItem[];
  locale: string;
  onDeleted?: (id: string) => void;
  /** Set of post IDs currently selected for bulk actions (#10). */
  selectedIds?: Set<string>;
  /** Callback when the user toggles selection for a single post. */
  onToggleSelect?: (id: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            locale={locale}
            animationDelay={Math.min(index * 0.04, 0.2)}
            onDeleted={onDeleted}
            isSelected={selectedIds.has(post.id)}
            onSelectChange={onToggleSelect}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
