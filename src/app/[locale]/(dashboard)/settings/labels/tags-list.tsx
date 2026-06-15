"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, Hash } from "lucide-react";
import { TagItem } from "./tag-item";
import type { UserTagWithCount } from "@/lib/actions/tag-actions";

type SortMode = "name" | "count";

interface TagsListProps {
  tags: UserTagWithCount[];
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
    sortByName: string;
    sortByCount: string;
  };
}

/**
 * Client-side tag list with a sort toggle.
 *
 * Default sort: alphabetical by name (ascending).
 * Switching to "by count" sorts descending by `post_count`, falling back to
 * alphabetical order to keep the list stable when many tags share the same
 * count (e.g. all zero).
 */
export function TagsList({ tags, locale, t }: TagsListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const sortedTags = useMemo(() => {
    const copy = [...tags];
    if (sortMode === "count") {
      copy.sort((a, b) => {
        if (b.post_count !== a.post_count) return b.post_count - a.post_count;
        return a.name.localeCompare(b.name, locale);
      });
    } else {
      copy.sort((a, b) => a.name.localeCompare(b.name, locale));
    }
    return copy;
  }, [tags, sortMode, locale]);

  return (
    <div className="space-y-2">
      {/* Sort toggle row */}
      <div className="flex items-center justify-end gap-1 rounded-[20px] border border-white/5 bg-white/30 px-2 py-1 backdrop-blur-sm dark:bg-card/30 w-fit ml-auto">
        <button
          type="button"
          onClick={() => setSortMode("name")}
          aria-pressed={sortMode === "name"}
          className={
            sortMode === "name"
              ? "inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 transition-colors"
              : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          <ArrowDownAZ className="h-3.5 w-3.5" />
          {t.sortByName}
        </button>
        <button
          type="button"
          onClick={() => setSortMode("count")}
          aria-pressed={sortMode === "count"}
          className={
            sortMode === "count"
              ? "inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 transition-colors"
              : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          <Hash className="h-3.5 w-3.5" />
          {t.sortByCount}
        </button>
      </div>

      {/* Tag list */}
      {sortedTags.map((tag) => (
        <TagItem
          key={tag.id}
          id={tag.id}
          name={tag.name}
          color={tag.color}
          postCount={tag.post_count}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}
