import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
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
  const t = await getTranslations("posts");
  const { locale } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const statusFilter = sp?.status;
  let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  const { data: posts, error: postsError } = await query;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (postsError || !session) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{posts?.length ?? 0} {t("title").toLowerCase()}</p>
        </div>
        <Link href={`/${locale}/posts/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newPost")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((filter) => (
          <Link key={filter.value} href={`/${locale}/posts${filter.value ? `?status=${filter.value}` : ""}`}>
            <Button
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
            >
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noPosts")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noPostsSubtitle")}</p>
            <Link href={`/${locale}/posts/new`} className="mt-4">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("newPost")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post: { id: string; content: string; status: string; platforms: string[]; scheduled_at: string | null; created_at: string; updated_at: string }) => (
            <PostCard key={post.id} post={post} locale={locale} t={t} />
          ))}
        </div>
      )}
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
    <Card>
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
