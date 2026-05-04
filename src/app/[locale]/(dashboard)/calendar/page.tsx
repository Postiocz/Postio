import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./_calendar-view";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ platform?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });
  const navT = await getTranslations({ locale, namespace: "nav" });
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <div className="text-muted-foreground">Must be logged in.</div>;
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "draft")
    .order("scheduled_at", { ascending: true });

  if (postsError) {
    return <div className="text-muted-foreground">Error loading posts.</div>;
  }

  const platforms = [
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
    { id: "twitter", label: "X" },
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

      <CalendarView
        posts={posts ?? []}
        platforms={platforms}
        selectedPlatform={sp?.platform ?? ""}
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
        }}
      />
    </div>
  );
}
