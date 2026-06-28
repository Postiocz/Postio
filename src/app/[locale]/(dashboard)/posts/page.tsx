import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { syncPublishedPosts, cleanupAutoDeletedPosts } from "@/lib/actions/posts";
import { getUserTags } from "@/lib/actions/tag-actions";
import type { PostStatus } from "@/lib/types";
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

  // Sync published posts with external platforms (throttled: 30 min cooldown via last_sync_at)
  await syncPublishedPosts();

  // Auto-delete posts that have passed their auto_delete_at timestamp
  await cleanupAutoDeletedPosts();

  // Load user's internal tags for the tag filter dropdown
  const tagsResult = await getUserTags();

  const { data: rawPosts, error: postsError } = await supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100); // protective cap — TODO: replace with cursor-based pagination (#4)

  if (postsError) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

  const posts = rawPosts?.map(post => {
    const postPlatforms = post.post_platforms || [];
    postPlatforms.sort((a: any, b: any) => a.platform.localeCompare(b.platform));

    const statuses: PostStatus[] = postPlatforms.map((p: any) => p.status);
    let computedStatus: PostStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";
    // `archived` only wins when ALL platforms are archived.
    else if (statuses.length > 0 && statuses.every((s: PostStatus) => s === "archived")) {
      computedStatus = "archived";
    }

    // Normalize post_tags → flat array of { id, name, color }.
    // Supabase returns the join as [{ tags: { id, name, color } | null }].
    type TagJoinRow = { tags: { id: string; name: string; color: string } | null };
    const normalizedPostTags = ((post.post_tags ?? []) as TagJoinRow[])
      .map((row) => row.tags)
      .filter((t): t is { id: string; name: string; color: string } => t !== null);

    return {
      ...post,
      status: computedStatus,
      platforms: postPlatforms.map((p: any) => p.platform),
      post_platforms: postPlatforms,
      post_tags: normalizedPostTags,
    };
  }) || [];

  return (
    <div className="relative space-y-8 max-w-3xl mx-auto">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative">
        <PostsContainer
          initialPosts={posts.map((post) => ({
            id: post.id,
            content: post.content,
            status: post.status,
            platforms: post.platforms ?? [],
            post_platforms: post.post_platforms ?? [],
            scheduled_at: post.scheduled_at,
            created_at: post.created_at,
            location: post.location ?? null,
            tags: post.tags ?? [],
            post_tags: post.post_tags ?? [],
            media_urls: post.media_urls ?? [],
            published_platforms: post.published_platforms ?? [],
            external_ids: post.external_ids ?? null,
          }))}
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
          tScheduledAt={t("scheduledAt")}
          tEditPost={t("editPost")}
          tDeleteConfirmTitle={t("deleteConfirmTitle")}
          tDeleteConfirmDesc={t("deleteConfirmDesc")}
          tDeleteConfirmAction={t("deleteConfirmAction")}
          tDeleteCancel={t("deleteCancel")}
          tRepublish={t("republish")}
          tRemovedExternallyMsg={t("removedExternallyMsg")}
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
        />
      </div>
    </div>
  );
}
