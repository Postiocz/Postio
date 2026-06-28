import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserTags } from "@/lib/actions/tag-actions";
import { normalizePost, type NormalizedPost } from "./normalize-post";
import { PostsContainer } from "./_posts-container";

// Force dynamic rendering on every navigation so the freshly-mutated
// `posts.status` / `post_platforms.status` after a publish / archive
// / delete is reflected in PostCard without a manual page reload.
// Without this, Next.js may serve a cached RSC payload that still
// shows the pre-mutation state (e.g. a "Koncept" badge after the
// user just re-published to LinkedIn). `revalidateAllLocales("/posts")`
// in the publish / delete server actions already invalidates the
// path cache, but RSC payload caching is a separate layer that we
// opt out of here.
export const dynamic = "force-dynamic";

/**
 * Cursor-based pagination for the Posts page (#4).
 *
 * Uses keyset pagination on `created_at` descending — fetching PAGE_SIZE + 1
 * rows to detect whether a "has more" page exists. The extra row becomes the
 * next cursor value and is **not** rendered.
 *
 * Advantages over offset:
 *   - No N+1 scan (Postgres jumps straight to the keyset position)
 *   - No duplicate/missing rows when data changes between pages
 *   - Constant-time seek regardless of depth
 *
 * "Load more" appends via a server action (fetchMorePosts) — no URL changes.
 */
const PAGE_SIZE = 20;

export default async function PostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "posts" });
  const tAi = await getTranslations({ locale, namespace: "ai" });
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

  // Sync + cleanup are now handled by Vercel Cron (/api/cron/sync-posts).
  // Removed blocking server actions from page render to avoid slow initial load.
  // See: #6 in ukol.md

  // Load user's internal tags for the tag filter dropdown
  const tagsResult = await getUserTags();

  // Keyset pagination: fetch PAGE_SIZE + 1 to detect "has more"
  const { data: rawPosts, error: postsError } = await supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (postsError) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

  // Detect "has more" by fetching PAGE_SIZE + 1 rows. The extra row becomes
  // the cursor for the next page and is NOT rendered.
  const hasMore = (rawPosts?.length ?? 0) > PAGE_SIZE;
  const pagedPosts = rawPosts?.slice(0, PAGE_SIZE) ?? [];

  const posts: NormalizedPost[] = pagedPosts.map(normalizePost);

  // Cursor = created_at of the last rendered row (for next page).
  const lastCursor: string | undefined =
    pagedPosts.length >= PAGE_SIZE
      ? pagedPosts[pagedPosts.length - 1]?.created_at
      : undefined;

  return (
    <div className="relative space-y-8 max-w-3xl mx-auto">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative">
        <PostsContainer
          initialPosts={posts}
          locale={locale}
          postsCount={posts.length}
          tags={tagsResult.success && tagsResult.data ? tagsResult.data : []}
          tTitle={t("title")}
          tNewPost={t("newPost")}
          tAllPlatforms={t("allPlatforms")}
          tFilterAll={t("filterAll")}
          tStatusDraft={t("statusDraft")}
          tStatusScheduled={t("statusScheduled")}
          tStatusPublished={t("statusPublished")}
          tStatusFailed={t("statusFailed")}
          tStatusRemovedExternally={t("statusRemovedExternally")}
          tStatusArchived={t("statusArchived")}
          tNoPosts={t("noPosts")}
          tNoPostsSubtitle={t("noPostsSubtitle")}
          tFilterByTag={t("filterByTag")}
          tAllTags={t("allTags")}
          tNoTagsAvailable={t("noTagsAvailable")}
          tLabels={{
            newPost: t("newPost"),
            editPost: t("editPost"),
            content: t("content"),
            contentPlaceholder: t("contentPlaceholder"),
            selectPlatforms: t("selectPlatforms"),
            saveDraft: t("saveDraft"),
            schedule: t("schedule"),
            publishNow: t("publishNow"),
            scheduledAt: t("scheduledAt"),
            saving: t("saving"),
            addTags: t("addTags"),
            internalTags: t("internalTags"),
            internalTagsPlaceholder: t("internalTagsPlaceholder"),
            createTag: t("createTag"),
            noInternalTags: t("noInternalTags"),
            selectColor: t("selectColor"),
            add: t("add"),
            cancel: t("cancel"),
            locationPlaceholder: t("locationPlaceholder"),
            postCreated: t("postCreated"),
            postUpdated: t("postUpdated"),
            errorSaving: t("errorSaving"),
            characterCount: t("characterCount"),
            maxFilesReached: t("maxFilesReached"),
            addMedia: t("addMedia"),
            dropMedia: t("dropMedia"),
            uploading: t("uploading"),
            uploadError: t("uploadError"),
            uploadSuccess: t("uploadSuccess"),
            fileTooLarge: t("fileTooLarge"),
            fileTooLargeImage: t("fileTooLargeImage"),
            fileTooLargeVideo: t("fileTooLargeVideo"),
            fileDeleted: t("fileDeleted"),
            invalidFileType: t("invalidFileType"),
            statusDraft: t("statusDraft"),
            statusScheduled: t("statusScheduled"),
            statusPublished: t("statusPublished"),
            statusFailed: t("statusFailed"),
            remoteEditSuccess: t("remoteEditSuccess"),
            photoChangeNotAllowed: t("photoChangeNotAllowed"),
            updateOnSocials: t("updateOnSocials"),
            onlyTextUpdatePossible: t("onlyTextUpdatePossible"),
            previewTitle: t("previewTitle"),
            viewLive: t("viewLive"),
            noPublishedPlatforms: t("noPublishedPlatforms"),
            previewPlaceholderName: t("previewPlaceholderName"),
            previewCaptionHint: t("previewCaptionHint"),
            previewNoMedia: t("previewNoMedia"),
            previewFacebookTab: t("previewFacebookTab"),
            previewInstagramTab: t("previewInstagramTab"),
            previewYoutubeTab: t("previewYoutubeTab"),
            previewLinkedinTab: t("previewLinkedinTab"),
          }}
          tAi={{
            aiAssistant: tAi("aiAssistant"),
            improveText: tAi("improveText"),
            shortenText: tAi("shortenText"),
            generateTags: tAi("generateTags"),
            aiThinking: tAi("aiThinking"),
            aiSuccess: tAi("aiSuccess"),
            aiError: tAi("aiError"),
            aiEmptyContent: tAi("aiEmptyContent"),
            generateFromImage: tAi("generateFromImage"),
            aiNoImage: tAi("aiNoImage"),
          }}
          hasMore={hasMore}
          nextCursor={lastCursor}
        />
      </div>
    </div>
  );
}
