"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteTag } from "./actions";
import { EditTagDialog } from "./edit-tag-dialog";

interface TagItemProps {
  id: string;
  name: string;
  color: string;
  postCount: number;
  locale: string;
  t: {
    deleteConfirm: string;
    deleteTag: string;
    editTag: string;
    nameLabel: string;
    namePlaceholder: string;
    colorLabel: string;
    cancel: string;
    save: string;
    tagUpdated: string;
    tagNameExists: string;
    noPosts: string;
    onePost: string;
    postsCount: string;
    postsCountFew: string;
  };
}

/**
 * Pluralize the post-count badge text for a given locale.
 *
 * Czech & Ukrainian have a dedicated "few" form for 2-4 (e.g. "2 příspěvky",
 * "3 příspєкації") that English doesn't, so we branch on locale.
 */
function formatPostsCount(
  count: number,
  locale: string,
  t: TagItemProps["t"],
): string {
  if (count === 0) return t.noPosts;
  if (count === 1) return t.onePost;

  // Slavic-style "few" form (2-4): handled separately for cs/uk.
  if ((locale === "cs" || locale === "uk") && count >= 2 && count <= 4) {
    return `${count} ${t.postsCountFew}`;
  }

  return `${count} ${t.postsCount}`;
}

export function TagItem({
  id,
  name,
  color,
  postCount,
  locale,
  t,
}: TagItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(t.deleteConfirm);
    if (!confirmed) return;

    setIsDeleting(true);
    await deleteTag(id);
    setIsDeleting(false);
  };

  // Strings passed through to the edit dialog (subset of the same `t` object)
  const editT = {
    editTag: t.editTag,
    nameLabel: t.nameLabel,
    namePlaceholder: t.namePlaceholder,
    colorLabel: t.colorLabel,
    cancel: t.cancel,
    save: t.save,
    tagUpdated: t.tagUpdated,
    tagNameExists: t.tagNameExists,
  };

  const hasPosts = postCount > 0;

  return (
    <div className="group flex items-center justify-between rounded-[20px] border border-white/5 bg-white/50 px-4 py-4 backdrop-blur-sm dark:bg-card/40 transition-all duration-200 hover:border-white/10 hover:bg-white/70 dark:hover:bg-card/60">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium truncate">{name}</span>
        <span
          className={
            hasPosts
              ? "inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300 flex-shrink-0"
              : "inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-muted-foreground/60 flex-shrink-0"
          }
          title={formatPostsCount(postCount, locale, t)}
          aria-label={formatPostsCount(postCount, locale, t)}
        >
          {formatPostsCount(postCount, locale, t)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <EditTagDialog
          tagId={id}
          initialName={name}
          initialColor={color}
          t={editT}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="opacity-0 transition-opacity duration-200 hover:text-destructive group-hover:opacity-100"
          aria-label={t.deleteTag}
          title={t.deleteTag}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
