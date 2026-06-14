import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./_calendar-client";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ platform?: string; status?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  const tAi = await getTranslations({ locale, namespace: "ai" });
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <div className="text-muted-foreground">Must be logged in.</div>;
  }

  let query = supabase
    .from("posts")
    .select("*, post_platforms(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: rawPosts, error: postsError } = await query;

  if (postsError) {
    console.log("Calendar posts error:", postsError);
    return <div className="text-muted-foreground">Error loading posts.</div>;
  }

  // Process data to match Post type expected by CalendarClient
  const posts = rawPosts?.map((post) => {
    const postPlatforms = post.post_platforms || [];
    postPlatforms.sort((a: any, b: any) => a.platform.localeCompare(b.platform));
    
    const statuses = postPlatforms.map((p: any) => p.status);
    let computedStatus = "draft";
    if (statuses.includes("failed")) computedStatus = "failed";
    else if (statuses.includes("publishing")) computedStatus = "publishing";
    else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
    else if (statuses.includes("published")) computedStatus = "published";
    else if (statuses.includes("scheduled")) computedStatus = "scheduled";

    // Get the earliest scheduled_at from platforms, or fallback to post.created_at
    const scheduledAt = postPlatforms.find((p: any) => p.scheduled_at)?.scheduled_at || post.created_at;

    return {
      ...post,
      status: computedStatus,
      platforms: postPlatforms.map((p: any) => p.platform),
      post_platforms: postPlatforms,
      scheduled_at: scheduledAt
    };
  });

  const platforms = [
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
    { id: "twitter", label: "Twitter/X" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "youtube", label: "YouTube" },
    { id: "tiktok", label: "TikTok" },
  ];

  const weekdays = t.raw("weekdays") as string[];
  const months = t.raw("months") as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground/60">{t("subtitle")}</p>
      </div>

      <CalendarClient
        posts={posts ?? []}
        platforms={platforms}
        initialPlatform={sp?.platform ?? ""}
        initialStatus={sp?.status ?? ""}
        weekdays={weekdays}
        months={months}
        locale={locale}
        tCalendar={{
          title: t("title"),
          month: t("month"),
          week: t("week"),
          allPlatforms: t("allPlatforms"),
          noPostsThisDay: t("noPostsThisDay"),
          addPost: t("addPost"),
          newPost: t("newPost"),
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
          errorSaving: t("errorSaving"),
          characterCount: t("characterCount"),
          maxFilesReached: t("maxFilesReached"),
          statusDraft: t("statusDraft"),
          statusScheduled: t("statusScheduled"),
          statusPublished: t("statusPublished"),
          statusFailed: t("statusFailed"),
          filterAll: t("filterAll"),
          editPost: t("editPost"),
          postUpdated: t("postUpdated"),
          addMedia: t("addMedia"),
          dropMedia: t("dropMedia"),
          uploading: t("uploading"),
          uploadSuccess: t("uploadSuccess"),
          uploadError: t("uploadError"),
          fileTooLarge: t("fileTooLarge"),
          fileTooLargeImage: t("fileTooLargeImage"),
          fileTooLargeVideo: t("fileTooLargeVideo"),
          fileDeleted: t("fileDeleted"),
          invalidFileType: t("invalidFileType"),
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
  );
}
