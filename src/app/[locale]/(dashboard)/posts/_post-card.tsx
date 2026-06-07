"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Edit, Clock, FileText, Play, RotateCcw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { deletePost, resetPostStatus } from "@/lib/actions/posts";
import { deleteFromMeta } from "@/lib/actions/publish";
import { EditPostDialog, EditPostData } from "@/components/edit-post-dialog";
import { DeletePostDialog } from "@/components/dashboard/delete-post-dialog";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-muted-foreground border border-gray-200 dark:bg-white/10 dark:border-white/10",
  scheduled: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
  publishing: "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  failed: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
  removed_externally: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
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

export type PostListItem = {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  scheduled_at: string | null;
  created_at: string;
  location: string | null;
  tags: string[];
  media_urls: string[];
  published_platforms?: string[];
  external_id?: string | null;
  removed_at?: string | null;
  removed_from_platform?: string | null;
};

function toLocaleTag(locale: string) {
  if (locale === "cs") return "cs-CZ";
  if (locale === "uk") return "uk-UA";
  return "en-US";
}

export function PostCard({
  post,
  locale,
  tStatusDraft,
  tStatusScheduled,
  tStatusPublished,
  tStatusFailed,
  tStatusRemovedExternally,
  tScheduledAt,
  tEditPost,
  tDeleteConfirmTitle,
  tDeleteConfirmDesc,
  tDeleteConfirmAction,
  tDeleteCancel,
  tRepublish,
  tRemovedExternallyMsg,
  onDeleted,
  animationDelay = 0,
  tLabels,
  tAi,
}: {
  post: PostListItem;
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tStatusRemovedExternally: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirmTitle: string;
  tDeleteConfirmDesc: string;
  tDeleteConfirmAction: string;
  tDeleteCancel: string;
  tRepublish: string;
  tRemovedExternallyMsg: string;
  onDeleted?: (id: string) => void;
  animationDelay?: number;
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
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const router = useRouter();

  const statusLabels: Record<string, string> = {
    draft: tStatusDraft,
    scheduled: tStatusScheduled,
    published: tStatusPublished,
    failed: tStatusFailed,
    removed_externally: tStatusRemovedExternally,
  };

  const statusLabel = statusLabels[post.status] ?? post.status;
  const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

  const handleDeleteConfirm = async (selectedPlatforms: string[], deleteFromApp: boolean) => {
    setIsDeleting(true);
    try {
      const isMultiple = post.status === "published" && post.published_platforms && post.published_platforms.length > 1;

      if (isMultiple) {
        let deletedCount = 0;
        // Smazat z vybraných Meta platforem
        for (const platform of selectedPlatforms) {
          const result = await deleteFromMeta({ postId: post.id, platform });
          if (result.success) {
            deletedCount++;
          } else {
            toast.error(`Smazání z ${platform} selhalo: ${result.error}`);
          }
        }
        
        // Smazat i z aplikace Postio, pokud si to uživatel přeje
        if (deleteFromApp) {
          const result = await deletePost(post.id);
          if (result.success) {
            setDeleteOpen(false);
            if (result.removedExternally) {
              router.refresh();
            } else {
              onDeleted?.(post.id);
            }
            toast.success("Příspěvek byl úspěšně smazán.");
            return;
          } else {
            toast.error(`Smazání z aplikace selhalo: ${result.error}`);
          }
        } else if (deletedCount > 0) {
           toast.success(`Příspěvek byl odstraněn z ${deletedCount} platformy/platforem.`);
           router.refresh();
           setDeleteOpen(false);
        }
      } else {
        // Klasické smazání (draft, scheduled, failed, nebo single published platform)
        const result = await deletePost(post.id);
        if (result.success) {
          setDeleteOpen(false);
          if (result.removedExternally) {
            router.refresh();
          } else {
            onDeleted?.(post.id);
          }
          toast.success("Příspěvek byl úspěšně smazán.");
          return;
        } else {
          toast.error(result.error || "Nepodařilo se smazat příspěvek.");
        }
      }
    } catch (e) {
      console.error("Error deleting post:", e);
      toast.error("Nastala neočekávaná chyba při mazání.");
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
      className="relative group bg-white/80 dark:bg-card/40 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.06] rounded-[24px] p-5 mb-6 transition-all hover:border-indigo-500/30 dark:hover:border-indigo-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-2xl"
    >
      {/* Action buttons – top right */}
      <div className="absolute top-5 right-5 flex gap-1 z-[50] sm:opacity-0 group-hover:sm:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 relative z-[50] cursor-pointer bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-black/[0.06] dark:border-white/10"
          title={tEditPost}
          onClick={() => setEditOpen(true)}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        {post.status === "removed_externally" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 relative z-[50] cursor-pointer bg-orange-50 dark:bg-orange-500/10 backdrop-blur-sm border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-500/20"
            onClick={handleRepublish}
            disabled={isRepublishing}
            title={tRepublish}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 relative z-[50] cursor-pointer bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-black/[0.06] dark:border-white/10 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
          disabled={isDeleting}
          title={tDeleteConfirmTitle}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* Media Preview – left on desktop, top on mobile */}
        {hasMedia && primaryMedia && (
          <div className="relative pointer-events-none sm:w-48 sm:min-w-48 sm:max-w-48 w-full shrink-0">
            <div className="relative overflow-hidden rounded-xl border border-white/10 dark:border-white/10 aspect-video sm:aspect-square sm:sticky sm:top-0">
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
              {/* Zobrazujeme publikované platformy */}
              {post.status === "published" && (post.published_platforms ?? []).length > 0 ? (
                (post.published_platforms ?? []).map((platformId) => {
                  const Icon = platformIcons[platformId.toLowerCase()] ?? FileText;
                  return (
                    <div
                      key={platformId}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-white/[0.03] border border-black/5 dark:border-white/5 shadow-sm shrink-0"
                    >
                      <Icon className="h-4 w-4 text-foreground/80" />
                    </div>
                  );
                })
              ) : (
                /* Pokud není publikováno, ukaž plánované s nízkou opacitou */
                (post.platforms ?? []).map((platformId) => {
                  const Icon = platformIcons[platformId.toLowerCase()] ?? FileText;
                  return (
                    <div
                      key={platformId}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 shrink-0 opacity-40"
                    >
                      <Icon className="h-4 w-4 text-foreground/60" />
                    </div>
                  );
                })
              )}
            </div>
            <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs ${statusStyle}`}>
              {statusLabel}
            </Badge>
          </div>

          {/* Post content – text with line clamp */}
          <div className="text-base text-foreground/90 whitespace-pre-line leading-relaxed line-clamp-3 mb-3">
            {post.content}
          </div>

          {/* Removed externally warning */}
          {post.status === "removed_externally" && (
            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  {tRemovedExternallyMsg.replace("__platform__", (post.removed_from_platform ?? "platform").charAt(0).toUpperCase() + (post.removed_from_platform ?? "platform").slice(1))}
                </span>
                {post.removed_at && (
                  <span className="text-[11px] text-orange-600/70 dark:text-orange-400/70">
                    {new Date(post.removed_at).toLocaleDateString(localeTag, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer: date + scheduled time */}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/50 border-t border-gray-200 dark:border-white/5 pt-3">
            <span>{createdDate}</span>
            {post.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tScheduledAt}: {scheduledTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>

    <EditPostDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      tAi={tAi}
      post={{
        id: post.id,
        content: post.content,
        platforms: post.platforms ?? [],
        scheduled_at: post.scheduled_at,
        status: post.status,
        location: post.location ?? null,
        tags: post.tags ?? [],
        media_urls: post.media_urls ?? [],
        published_platforms: post.published_platforms ?? [],
        external_id: post.external_id ?? null,
      }}
      locale={locale}
      tLabels={tLabels}
    />

    <DeletePostDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      post={{
        id: post.id,
        status: post.status,
        published_platforms: post.published_platforms ?? [],
      }}
      onConfirm={handleDeleteConfirm}
      isDeleting={isDeleting}
    />
    </>
  );
}

export function PostsList({
  posts,
  locale,
  tStatusDraft,
  tStatusScheduled,
  tStatusPublished,
  tStatusFailed,
  tStatusRemovedExternally,
  tScheduledAt,
  tEditPost,
  tDeleteConfirmTitle,
  tDeleteConfirmDesc,
  tDeleteConfirmAction,
  tDeleteCancel,
  tRepublish,
  tRemovedExternallyMsg,
  tLabels,
  tAi,
  onDeleted,
}: {
  posts: PostListItem[];
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tStatusRemovedExternally: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirmTitle: string;
  tDeleteConfirmDesc: string;
  tDeleteConfirmAction: string;
  tDeleteCancel: string;
  tRepublish: string;
  tRemovedExternallyMsg: string;
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
  onDeleted?: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            locale={locale}
            tStatusDraft={tStatusDraft}
            tStatusScheduled={tStatusScheduled}
            tStatusPublished={tStatusPublished}
            tStatusFailed={tStatusFailed}
            tStatusRemovedExternally={tStatusRemovedExternally}
            tScheduledAt={tScheduledAt}
            tEditPost={tEditPost}
            tDeleteConfirmTitle={tDeleteConfirmTitle}
            tDeleteConfirmDesc={tDeleteConfirmDesc}
            tDeleteConfirmAction={tDeleteConfirmAction}
            tDeleteCancel={tDeleteCancel}
            tRepublish={tRepublish}
            tRemovedExternallyMsg={tRemovedExternallyMsg}
            animationDelay={Math.min(index * 0.04, 0.2)}
            onDeleted={onDeleted}
            tLabels={tLabels}
            tAi={tAi}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
