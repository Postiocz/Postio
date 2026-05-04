import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import { PostsList } from "./_post-card";

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "posts" });
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

  const statusFilter = sp?.status;
  let query = supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: posts, error: postsError } = await query;

  if (postsError) {
    return <div className="text-muted-foreground">{t("errorDeleting")}</div>;
  }

  const filters = [
    { label: t("filterAll"), value: "" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusScheduled"), value: "scheduled" },
    { label: t("statusPublished"), value: "published" },
    { label: t("statusFailed"), value: "failed" },
  ];

  return (
    <div className="relative space-y-8 max-w-3xl mx-auto">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground/60">
              {posts?.length ?? 0} {t("title").toLowerCase()}
            </p>
          </div>
          <Link href={`/${locale}/posts/new`} className="sm:w-auto">
            <Button
              className="w-full gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] rounded-[20px] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {t("newPost")}
            </Button>
          </Link>
        </div>

        {/* Filters — Pills style */}
        <div className="flex flex-wrap gap-2 pt-4">
          {filters.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <Link
                key={filter.value}
                href={`/${locale}/posts${filter.value ? `?status=${filter.value}` : ""}`}
              >
                <div
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer border ${
                    isActive
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.03] border-white/5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Posts List / Empty State — with top margin */}
        <div className="mt-10 space-y-6">
        {/* Empty State — Visual Center */}
        {posts.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl" />
              <FileText className="relative h-16 w-16 text-indigo-500/80" />
            </div>
            <p className="text-xl font-medium text-muted-foreground/60">
              {t("noPosts")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/40">
              {t("noPostsSubtitle")}
            </p>
            <Link href={`/${locale}/posts/new`} className="mt-6">
              <Button
                variant="outline"
                className="gap-2 rounded-[20px] bg-card/40 border-white/5 backdrop-blur-md hover:bg-card/60"
              >
                <Plus className="h-4 w-4" />
                {t("newPost")}
              </Button>
            </Link>
          </div>
        ) : (
          <PostsList
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
            }))}
            locale={locale}
            tStatusDraft={t("statusDraft")}
            tStatusScheduled={t("statusScheduled")}
            tStatusPublished={t("statusPublished")}
            tStatusFailed={t("statusFailed")}
            tScheduledAt={t("scheduledAt")}
            tEditPost={t("editPost")}
            tDeleteConfirm={t("deleteConfirm")}
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
              fileTooLarge: t("fileTooLarge"),
              statusDraft: t("statusDraft"),
              statusScheduled: t("statusScheduled"),
              statusPublished: t("statusPublished"),
              statusFailed: t("statusFailed"),
            }}
          />
        )}
        </div>
      </div>
    </div>
  );
}
