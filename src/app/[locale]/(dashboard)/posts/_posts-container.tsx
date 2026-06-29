"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { PostFiltersRow, type SortOption } from "@/components/post-filters-row";
import { PostsList, PostListItem } from "./_post-card";
import { fetchMorePosts, fetchFilteredPosts } from "./actions";

export function PostsContainer({
  initialPosts,
  locale,
  postsCount,
  tags = [],
  tTitle,
  tNewPost,
  tAllPlatforms,
  tFilterAll,
  tStatusDraft,
  tStatusScheduled,
  tStatusPublished,
  tStatusFailed,
  tStatusRemovedExternally,
  tStatusArchived,
  tNoPosts,
  tNoPostsSubtitle,
  tLabels,
  tAi,
  tFilterByTag,
  tAllTags,
  tNoTagsAvailable,
  hasMore,
  nextCursor,
}: {
  initialPosts: PostListItem[];
  locale: string;
  postsCount: number;
  tags?: { id: string; name: string; color: string }[];
  tTitle: string;
  tNewPost: string;
  tAllPlatforms: string;
  tFilterAll: string;
  tStatusDraft: string;
  tStatusScheduled: string;
  tStatusPublished: string;
  tStatusFailed: string;
  tStatusRemovedExternally: string;
  tStatusArchived: string;
  tNoPosts: string;
  tNoPostsSubtitle: string;
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
    // Internal organization tags (Nastavení → Štítky)
    internalTags: string;
    internalTagsPlaceholder: string;
    createTag: string;
    noInternalTags: string;
    selectColor: string;
    add: string;
    cancel: string;
    remoteEditSuccess?: string;
    photoChangeNotAllowed?: string;
    updateOnSocials?: string;
    onlyTextUpdatePossible?: string;
    // Preview dialog labels
    preview?: string;
    previewTitle?: string;
    viewLive?: string;
    noPublishedPlatforms?: string;
    previewPlaceholderName?: string;
    previewCaptionHint?: string;
    previewNoMedia?: string;
    previewFacebookTab?: string;
    previewInstagramTab?: string;
    previewYoutubeTab?: string;
    previewLinkedinTab?: string;
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
    generateFromImage: string;
    aiNoImage: string;
  };
  tFilterByTag: string;
  tAllTags: string;
  tNoTagsAvailable: string;
  /** Whether another page of posts exists (cursor-based pagination). */
  hasMore?: boolean;
  /** `created_at` value of the last rendered row — used as cursor for next page. */
  nextCursor?: string | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [activePlatform, setActivePlatform] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [activeSort, setActiveSort] = useState<SortOption>("newest");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);
  const [currentCursor, setCurrentCursor] = useState(nextCursor ?? null);
  /** Total count of posts matching the current filters (for "X z Y" header). */
  const [filteredCount, setFilteredCount] = useState(postsCount);
  const t = useTranslations("posts");

  // Sync local state with server-provided initialPosts whenever the server
  // re-renders this page (e.g. after revalidatePath("/posts") in a mutation
  // route). Without this, edits like "Uložit interní metadata" would land in
  // the DB and in revalidated initialPosts, but the in-memory list would still
  // show stale data until the user manually reloads the page.
  useEffect(() => {
    setPosts(initialPosts);
    setFilteredCount(postsCount);
  }, [initialPosts, postsCount]);

  // Debounced server-side filter fetch. When any filter changes, we call
  // fetchFilteredPosts() to get a fresh first page from the server instead
  // of filtering the in-memory list locally.
  const applyFilters = useCallback(
    async (platform: string, status: string, tagId: string, sort: SortOption) => {
      setIsLoadingFilter(true);
      try {
        const result = await fetchFilteredPosts({
          platform: platform || undefined,
          status: status || undefined,
          tagId: tagId || undefined,
          sort,
        });

        setPosts(result.posts);
        setCurrentCursor(result.nextCursor ?? null);
        setFilteredCount(result.totalCount);
      } catch {
        // Silently fail — keep current posts as fallback.
      } finally {
        setIsLoadingFilter(false);
      }
    },
    [],
  );

  const handleFilterChange = useCallback(
    (platform: string, status: string) => {
      setActivePlatform(platform);
      setActiveStatus(status);
      applyFilters(platform, status, activeTag, activeSort);
    },
    [applyFilters, activeTag, activeSort],
  );

  const handleTagChange = useCallback(
    (tagId: string) => {
      setActiveTag(tagId);
      applyFilters(activePlatform, activeStatus, tagId, activeSort);
    },
    [applyFilters, activePlatform, activeStatus, activeSort],
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      setActiveSort(sort);
      applyFilters(activePlatform, activeStatus, activeTag, sort);
    },
    [applyFilters, activePlatform, activeStatus, activeTag],
  );

  const hasActiveFilter = useMemo(
    () => !!(activePlatform || activeStatus || activeTag),
    [activePlatform, activeStatus, activeTag],
  );

  const handleDeleted = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setFilteredCount((prev) => Math.max(0, prev - 1));
  }, []);

  // "Load more" handler — calls server action with current filters, appends posts.
  const handleLoadMore = useCallback(async () => {
    if (!currentCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchMorePosts(currentCursor, {
        platform: activePlatform || undefined,
        status: activeStatus || undefined,
        tagId: activeTag || undefined,
        sort: activeSort,
      });

      if (result.posts.length > 0) {
        setPosts((prev) => [...prev, ...result.posts]);
      }
      setCurrentCursor(result.nextCursor ?? null);
    } catch {
      // Silently fail — user can retry by clicking again.
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentCursor, isLoadingMore, activePlatform, activeStatus, activeTag, activeSort]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{tTitle}</h1>
          <p className="mt-1 text-muted-foreground/60">
            {hasActiveFilter
              ? t("filteredCount", { showing: posts.length, total: filteredCount })
              : `${filteredCount} ${tTitle.toLowerCase()}`
            }
          </p>
        </div>
        <Link href={`/${locale}/posts/new`} className="sm:w-auto">
          <Button
            className="w-full gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] rounded-[20px] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {tNewPost}
          </Button>
        </Link>
      </div>

      <div className="mt-3">
        <PostFiltersRow
          platformValue={activePlatform}
          statusValue={activeStatus}
          sortValue={activeSort}
          onChange={handleFilterChange}
          onSortChange={handleSortChange}
          allPlatformsLabel={tAllPlatforms}
          allStatusLabel={tFilterAll}
          statusDraftLabel={tStatusDraft}
          statusScheduledLabel={tStatusScheduled}
          statusPublishedLabel={tStatusPublished}
          statusFailedLabel={tStatusFailed}
          statusRemovedExternallyLabel={tStatusRemovedExternally}
          statusArchivedLabel={tStatusArchived}
          tagValue={activeTag}
          tagOptions={tags}
          tagLabel={tFilterByTag}
          allTagsLabel={tAllTags}
          noTagsLabel={tNoTagsAvailable}
          onTagChange={handleTagChange}
          tSortNewestFirst={t("sortNewestFirst")}
          tSortOldestFirst={t("sortOldestFirst")}
          tSortByPublishDate={t("sortByPublishDate")}
        />
      </div>

      {/* Loading overlay during filter change */}
      {isLoadingFilter && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Posts List / Empty State */}
      <div className="mt-10 space-y-6">
        {!isLoadingFilter && posts.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
              <FileText className="relative h-16 w-16 text-indigo-500/80" />
            </div>
            <p className="text-xl font-medium text-muted-foreground/60">
              {initialPosts.length === 0 ? tNoPosts : tFilterAll}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/40">
              {initialPosts.length === 0 ? tNoPostsSubtitle : ""}
            </p>
            {initialPosts.length === 0 && (
              <Link href={`/${locale}/posts/new`} className="mt-6">
                <Button
                  variant="outline"
                  className="gap-2 rounded-[20px] bg-card/40 border-white/5 backdrop-blur-md hover:bg-card/60"
                >
                  <Plus className="h-4 w-4" />
                  {tNewPost}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          !isLoadingFilter && (
            <div className="space-y-6">
              <PostsList
                posts={posts}
                locale={locale}
                tLabels={tLabels}
                tAi={tAi}
                onDeleted={handleDeleted}
              />

              {/* Load More — cursor-based pagination (#4) */}
              {currentCursor && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={isLoadingMore}
                    className="rounded-[20px] bg-card/40 border-white/5 backdrop-blur-md hover:bg-card/60"
                    onClick={handleLoadMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("loadingMore")}
                      </>
                    ) : (
                      t("loadMore")
                    )}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </>
  );
}
