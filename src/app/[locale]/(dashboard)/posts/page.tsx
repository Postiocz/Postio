import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { syncPublishedPosts } from "@/lib/actions/posts";
import { PostsContainer } from "./_posts-container";

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

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

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
            scheduled_at: post.scheduled_at,
            created_at: post.created_at,
            location: post.location ?? null,
            tags: post.tags ?? [],
            media_urls: post.media_urls ?? [],
            published_platforms: post.published_platforms ?? [],
            external_id: post.external_id ?? null,
            removed_at: post.removed_at ?? null,
            removed_from_platform: post.removed_from_platform ?? null,
          }))}
          locale={locale}
          postsCount={posts.length}
          tTitle={t("title")}
          tNewPost={t("newPost")}
          tAllPlatforms={t("allPlatforms")}
          tFilterAll={t("filterAll")}
          tStatusDraft={t("statusDraft")}
          tStatusScheduled={t("statusScheduled")}
          tStatusPublished={t("statusPublished")}
          tStatusFailed={t("statusFailed")}
          tStatusRemovedExternally={t("statusRemovedExternally")}
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
          }}
        />
      </div>
    </div>
  );
}
