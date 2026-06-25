"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { PostFiltersRow } from "@/components/post-filters-row";
import { PostsList, PostListItem } from "./_post-card";

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
  tFilterByTag,
  tAllTags,
  tNoTagsAvailable,
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
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [activePlatform, setActivePlatform] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [refreshAfterExit, setRefreshAfterExit] = useState(false);
  const router = useRouter();

  // Sync local state with server-provided initialPosts whenever the server
  // re-renders this page (e.g. after router.refresh() in EditPostDialog).
  // Without this, edits like "Uložit interní metadata" would land in the DB
  // and in revalidated initialPosts, but the in-memory list would still show
  // stale data until the user manually reloads the page.
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Force a fresh server-component fetch on every mount of the /posts page.
  //
  // Why this is necessary:
  // After publishing from /posts/{id} or /posts/new, those callers navigate
  // back to /posts via `router.push(...)`. The server action calls
  // `revalidatePath("/posts", ...)` which clears the SERVER-side fetch cache,
  // but Next.js App Router keeps a CLIENT-side RSC payload cache for the
  // /posts route. Without a fresh `router.refresh()` the navigation can
  // reuse the stale RSC payload and the new "published" status of the post
  // is NOT reflected in the UI, even though the DB was updated correctly.
  //
  // PostsContainer is rendered inside posts/page.tsx (not the dashboard
  // layout), so it mounts/unmounts on every navigation to /posts – that is
  // the right hook for forcing a server refresh.
  useEffect(() => {
    router.refresh();
    // We intentionally only refresh on mount. Re-running on every render
    // (e.g. when `initialPosts` changes after a refresh) would cause an
    // infinite refresh loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback((platform: string, status: string) => {
    setActivePlatform(platform);
    setActiveStatus(status);
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activePlatform) {
        const postPlatforms = post.platforms || [];
        if (!postPlatforms.includes(activePlatform)) return false;
      }
      if (activeStatus) {
        if (post.status !== activeStatus) return false;
      }
      if (activeTag) {
        const postTagIds = (post.post_tags ?? []).map((t) => t.id);
        if (!postTagIds.includes(activeTag)) return false;
      }
      return true;
    });
  }, [posts, activePlatform, activeStatus, activeTag]);

  const handleDeleted = useCallback((id: string) => {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) setRefreshAfterExit(true);
      return next;
    });
  }, []);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{tTitle}</h1>
          <p className="mt-1 text-muted-foreground/60">
            {postsCount} {tTitle.toLowerCase()}
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
          onChange={handleFilterChange}
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
          onTagChange={setActiveTag}
        />
      </div>

      {/* Posts List / Empty State */}
      <div className="mt-10 space-y-6">
        {filteredPosts.length === 0 ? (
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
          <div className="space-y-6">
            {(function() {
              if (refreshAfterExit) {
                router.refresh();
                setRefreshAfterExit(false);
              }
              return null;
            })()}
            <PostsList
              posts={filteredPosts}
              locale={locale}
              tStatusDraft={tStatusDraft}
              tStatusScheduled={tStatusScheduled}
              tStatusPublished={tStatusPublished}
              tStatusFailed={tStatusFailed}
              tStatusRemovedExternally={tStatusRemovedExternally}
              tStatusArchived={tStatusArchived}
              tScheduledAt={tScheduledAt}
              tEditPost={tEditPost}
              tDeleteConfirmTitle={tDeleteConfirmTitle}
              tDeleteConfirmDesc={tDeleteConfirmDesc}
              tDeleteConfirmAction={tDeleteConfirmAction}
              tDeleteCancel={tDeleteCancel}
              tRepublish={tRepublish}
              tRemovedExternallyMsg={tRemovedExternallyMsg}
              tLabels={tLabels}
              tAi={tAi}
              onDeleted={handleDeleted}
            />
          </div>
        )}
      </div>
    </>
  );
}
