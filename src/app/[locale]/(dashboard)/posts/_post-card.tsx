"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Edit, Clock, FileText } from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/10 text-muted-foreground border border-white/10",
  scheduled: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  published: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border border-red-500/30",
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

type PostListItem = {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  scheduled_at: string | null;
  created_at: string;
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
  tDeleteConfirm,
  onDeleted,
  animationDelay = 0,
}: {
  post: PostListItem;
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirm: string;
  onDeleted?: (id: string) => void;
  animationDelay?: number;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const statusLabels: Record<string, string> = {
    draft: tStatusDraft,
    scheduled: tStatusScheduled,
    published: tStatusPublished,
    failed: tStatusFailed,
  };

  const statusLabel = statusLabels[post.status] ?? post.status;
  const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

  const handleDelete = async () => {
    if (!confirm(tDeleteConfirm)) return;
    setIsDeleting(true);
    const result = await deletePost(post.id);
    if (result.success) {
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
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.26, ease: "easeOut", delay: animationDelay }}
      className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[24px] p-6 mb-6 transition-all hover:border-indigo-500/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] border border-white/5">
            <PlatformIcon className="h-5 w-5 text-foreground/80" />
          </div>
          <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs ${statusStyle}`}>
            {statusLabel}
          </Badge>
        </div>

        <div className="flex gap-1 shrink-0">
          <Link href={`/${locale}/posts/${post.id}`}>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8" title={tEditPost}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
            title={tDeleteConfirm}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="text-lg text-foreground/90 py-4 whitespace-pre-line leading-relaxed">
        {post.content}
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground/50 border-t border-white/5 pt-4">
        <span>{createdDate}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {tScheduledAt}: {scheduledTime}
        </span>
      </div>
    </motion.article>
  );
}

export function PostsList({
  initialPosts,
  locale,
  tStatusDraft,
  tStatusScheduled,
  tStatusPublished,
  tStatusFailed,
  tScheduledAt,
  tEditPost,
  tDeleteConfirm,
}: {
  initialPosts: PostListItem[];
  locale: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tScheduledAt: string;
  tEditPost: string;
  tDeleteConfirm: string;
}) {
  const [posts, setPosts] = useState<PostListItem[]>(initialPosts);
  const [refreshAfterExit, setRefreshAfterExit] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <AnimatePresence
        onExitComplete={() => {
          if (refreshAfterExit) router.refresh();
        }}
      >
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
            tDeleteConfirm={tDeleteConfirm}
            animationDelay={Math.min(index * 0.04, 0.2)}
            onDeleted={(id) => {
              setPosts((prev) => {
                const next = prev.filter((p) => p.id !== id);
                if (next.length === 0) setRefreshAfterExit(true);
                return next;
              });
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
