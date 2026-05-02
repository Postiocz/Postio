import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import Link from "next/link";
import { deletePost } from "@/lib/actions/posts";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "error"> = {
  draft: "secondary",
  scheduled: "warning",
  published: "success",
  failed: "error",
};

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

  const statusFilter = sp?.status;
  let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  const { data: posts, error: postsError } = await query;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (postsError || authError || !user) {
    return <div>{t("errorDeleting")}</div>;
  }

  const filters = [
    { label: t("filterAll"), value: "" },
    { label: t("draft"), value: "draft" },
    { label: t("scheduled"), value: "scheduled" },
    { label: t("published"), value: "published" },
    { label: t("failed"), value: "failed" },
  ];

  return (
    <div className="relative space-y-8">
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
          <div className="space-y-3">
            {posts.map((post: { id: string; content: string; status: string; platforms: string[]; scheduled_at: string | null; created_at: string; updated_at: string }) => (
              <PostCard key={post.id} post={post} locale={locale} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  locale,
  t,
}: {
  post: {
    id: string;
    content: string;
    status: string;
    platforms: string[];
    scheduled_at: string | null;
    created_at: string;
    updated_at: string;
  };
  locale: string;
  t: (key: string) => string;
}) {
  const contentPreview = post.content.length > 200 ? post.content.slice(0, 200) + "..." : post.content;

  return (
    <Card className="bg-card/40 backdrop-blur-md border-white/5 rounded-[20px]">
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[post.status] ?? "default"}>
              {t(post.status)}
            </Badge>
            {post.platforms.map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{contentPreview}</p>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            {post.scheduled_at && (
              <span>{t("scheduledAt")}: {new Date(post.scheduled_at).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Link href={`/${locale}/posts/${post.id}`}>
            <Button variant="ghost" size="icon-xs" title={t("editPost")}>
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <form
            action={async () => {
              "use server";
              await deletePost(post.id);
            }}
          >
            <Button variant="ghost" size="icon-xs" type="submit">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
