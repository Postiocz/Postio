"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Edit, Clock, FileText } from "lucide-react";
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
import { deletePost } from "@/lib/actions/posts";
import { EditPostDialog, EditPostData } from "@/components/edit-post-dialog";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-muted-foreground border border-gray-200 dark:bg-white/10 dark:border-white/10",
  scheduled: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
  publishing: "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  failed: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
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
  tScheduledAt,
  tEditPost,
  tDeleteConfirmTitle,
  tDeleteConfirmDesc,
  tDeleteConfirmAction,
  tDeleteCancel,
  onDeleted,
  animationDelay = 0,
  tLabels,
}: {
  post: PostListItem;
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirmTitle: string;
  tDeleteConfirmDesc: string;
  tDeleteConfirmAction: string;
  tDeleteCancel: string;
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
  };
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const statusLabels: Record<string, string> = {
    draft: tStatusDraft,
    scheduled: tStatusScheduled,
    published: tStatusPublished,
    failed: tStatusFailed,
  };

  const statusLabel = statusLabels[post.status] ?? post.status;
  const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePost(post.id);
    if (result.success) {
      setDeleteOpen(false);
      onDeleted?.(post.id);
      return;
    }
    setIsDeleting(false);
  };

  const primaryPlatform = post.platforms[0]?.toLowerCase();
  const PlatformIcon = (primaryPlatform ? platformIcons[primaryPlatform] : undefined) ?? FileText;
  const localeTag = toLocaleTag(locale);
  const createdDate = new Date(post.created_at).toLocaleDateString(localeTag);
  const scheduledTime = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.26, ease: "easeOut", delay: animationDelay }}
      className="bg-white/80 dark:bg-card/40 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.06] rounded-[24px] p-6 mb-6 transition-all hover:border-indigo-500/30 dark:hover:border-indigo-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5">
            <PlatformIcon className="h-5 w-5 text-foreground/80" />
          </div>
          <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs ${statusStyle}`}>
            {statusLabel}
          </Badge>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8"
            title={tEditPost}
            onClick={() => setEditOpen(true)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
            title={tDeleteConfirmTitle}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="text-lg text-foreground/90 py-4 whitespace-pre-line leading-relaxed">
        {post.content}
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground/50 border-t border-gray-200 dark:border-white/5 pt-4">
        <span>{createdDate}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {tScheduledAt}: {scheduledTime}
        </span>
      </div>
    </motion.article>

    <EditPostDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      post={{
        id: post.id,
        content: post.content,
        platforms: post.platforms ?? [],
        scheduled_at: post.scheduled_at,
        status: post.status,
        location: post.location ?? null,
        tags: post.tags ?? [],
        media_urls: post.media_urls ?? [],
      }}
      locale={locale}
      tLabels={tLabels}
    />

    <Dialog
      open={deleteOpen}
      onOpenChange={(open) => {
        if (!open && !isDeleting) setDeleteOpen(false);
        if (open) setDeleteOpen(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tDeleteConfirmTitle}</DialogTitle>
          <DialogDescription>{tDeleteConfirmDesc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteOpen(false)}
            disabled={isDeleting}
          >
            {tDeleteCancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {tDeleteConfirmAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  tScheduledAt,
  tEditPost,
  tDeleteConfirmTitle,
  tDeleteConfirmDesc,
  tDeleteConfirmAction,
  tDeleteCancel,
  tLabels,
  onDeleted,
}: {
  posts: PostListItem[];
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirmTitle: string;
  tDeleteConfirmDesc: string;
  tDeleteConfirmAction: string;
  tDeleteCancel: string;
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
            tScheduledAt={tScheduledAt}
            tEditPost={tEditPost}
            tDeleteConfirmTitle={tDeleteConfirmTitle}
            tDeleteConfirmDesc={tDeleteConfirmDesc}
            tDeleteConfirmAction={tDeleteConfirmAction}
            tDeleteCancel={tDeleteCancel}
            animationDelay={Math.min(index * 0.04, 0.2)}
            onDeleted={onDeleted}
            tLabels={tLabels}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
