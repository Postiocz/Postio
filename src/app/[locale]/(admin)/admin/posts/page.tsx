/**
 * Admin – Globální správa příspěvků
 * Zobrazuje VŠECHNY příspěvky z tabulky public.posts.
 * Responzivní: tabulka na desktopu, karty na mobilu.
 * i18n: namespace adminPostsPage
 */

import { getTranslations } from "next-intl/server";
import { getAllPosts } from "@/modules/admin-core/actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Eye, Image as ImageIcon, Calendar } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  user?: { full_name: string | null; avatar_url: string | null } | null;
  platforms?: Database["public"]["Tables"]["post_platforms"]["Row"][];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  publishing: "bg-yellow-500/20 text-yellow-400",
  published: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  removed_externally: "bg-orange-500/20 text-orange-400",
  archived: "bg-gray-600/20 text-gray-500",
  ready: "bg-indigo-500/20 text-indigo-400",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function getAggregatedStatus(
  platforms: Database["public"]["Tables"]["post_platforms"]["Row"][]
): string {
  if (!platforms.length) return "draft";

  const priority = [
    "failed",
    "publishing",
    "removed_externally",
    "published",
    "scheduled",
    "ready",
    "draft",
  ];

  for (const status of priority) {
    if (platforms.some((p) => p.status === status)) {
      return status;
    }
  }

  const allArchived = platforms.every((p) => p.status === "archived");
  if (allArchived) return "archived";

  return "draft";
}

function getStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const map: Record<string, string> = {
    draft: t("statusDraft"),
    scheduled: t("statusScheduled"),
    publishing: t("statusPublishing"),
    published: t("statusPublished"),
    failed: t("statusFailed"),
    removed_externally: t("statusRemoved"),
    archived: t("statusArchived"),
    ready: t("statusReady"),
  };
  return map[status] ?? status;
}

export default async function AdminPostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminPostsPage" });
  const posts = await getAllPosts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-gray-400">
          {t("totalPosts", { count: posts.length })}
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-[20px] border border-white/10 bg-[#09090b]/80 backdrop-blur-xl md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("post")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("user")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("platforms")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("created")}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {posts.map((post: Post) => {
              const aggregatedStatus = getAggregatedStatus(post.platforms || []);
              const platforms = post.platforms || [];

              return (
                <tr
                  key={post.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  {/* Post content */}
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-white truncate">
                        {post.content || t("noContent")}
                      </p>
                      {post.media_urls?.length > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <ImageIcon className="h-3 w-3" />
                          {t("mediaCount", { count: post.media_urls.length })}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* User info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[20px] bg-white/5 text-sm font-medium text-white">
                        {post.user?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {post.user?.full_name ?? t("unknown")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {post.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Platforms */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {platforms.slice(0, 3).map((platform, i: number) => (
                        <Badge
                          key={i}
                          className="bg-white/5 text-gray-400 text-xs"
                        >
                          {PLATFORM_LABELS[platform.platform] || platform.platform}
                        </Badge>
                      ))}
                      {platforms.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{platforms.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <Badge
                      className={
                        STATUS_COLORS[aggregatedStatus] ?? STATUS_COLORS.draft
                      }
                    >
                      {getStatusLabel(aggregatedStatus, t)}
                    </Badge>
                  </td>

                  {/* Created at */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {format(new Date(post.created_at), "PP", {
                        locale: cs,
                      })}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                      <Eye className="h-4 w-4" />
                      {t("detail")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            {t("noPosts")}
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {posts.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {t("noPosts")}
          </div>
        ) : (
          posts.map((post: Post) => {
            const aggregatedStatus = getAggregatedStatus(post.platforms || []);
            const platforms = post.platforms || [];

            return (
              <div
                key={post.id}
                className="rounded-[20px] border border-white/10 bg-[#09090b]/80 p-4 backdrop-blur-xl"
              >
                {/* Row 1: Status + Date */}
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    className={
                      STATUS_COLORS[aggregatedStatus] ?? STATUS_COLORS.draft
                    }
                  >
                    {getStatusLabel(aggregatedStatus, t)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(post.created_at), "PP", { locale: cs })}
                  </span>
                </div>

                {/* Row 2: Content */}
                <p className="mt-3 text-sm font-medium text-white line-clamp-2">
                  {post.content || t("noContent")}
                </p>

                {/* Row 3: User + Platforms */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-white/5 text-xs font-medium text-white">
                      {post.user?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {post.user?.full_name ?? t("unknown")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {platforms.slice(0, 2).map((platform, i: number) => (
                      <Badge
                        key={i}
                        className="bg-white/5 text-gray-400 text-[10px]"
                      >
                        {PLATFORM_LABELS[platform.platform]?.slice(0, 5) || platform.platform?.slice(0, 5)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Row 4: Actions */}
                <div className="mt-3 flex justify-end">
                  <button className="flex items-center gap-2 rounded-[12px] px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                    {t("detail")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
