import type { PostStatus } from "@/lib/types";
import type { PostPlatform } from "./_post-card";

/** Minimal shape returned by normalizePost — structurally matches PostListItem. */
export type NormalizedPost = {
  id: string;
  content: string;
  status: PostStatus;
  platforms: string[];
  post_platforms: PostPlatform[];
  scheduled_at: string | null;
  created_at: string;
  location: string | null;
  tags: string[];
  post_tags: { id: string; name: string; color: string }[];
  media_urls: string[];
  deleted_at: string | null;
  published_platforms: string[];
  external_ids: Record<string, string> | null;
};

/**
 * Normalize a raw Supabase post row into the shape expected by PostListItem.
 * Shared between page.tsx (initial render) and fetchMorePosts() (load more).
 */
export function normalizePost(post: Record<string, unknown>): NormalizedPost {
  const postPlatforms = (post.post_platforms as any[]) || [];
  postPlatforms.sort((a, b) => a.platform.localeCompare(b.platform));

  const statuses: PostStatus[] = postPlatforms.map((p: any) => p.status);
  let computedStatus: PostStatus = "draft";
  if (statuses.includes("failed")) computedStatus = "failed";
  else if (statuses.includes("publishing")) computedStatus = "publishing";
  else if (statuses.includes("removed_externally")) computedStatus = "removed_externally";
  else if (statuses.includes("published")) computedStatus = "published";
  else if (statuses.includes("scheduled")) computedStatus = "scheduled";
  else if (statuses.length > 0 && statuses.every((s) => s === "archived")) {
    computedStatus = "archived";
  }

  type TagJoinRow = { tags: { id: string; name: string; color: string } | null };
  const normalizedPostTags = ((post.post_tags ?? []) as TagJoinRow[])
    .map((row) => row.tags)
    .filter((t): t is { id: string; name: string; color: string } => t !== null);

  return {
    id: String(post.id),
    content: String(post.content ?? ""),
    status: computedStatus,
    platforms: postPlatforms.map((p: any) => p.platform),
    post_platforms: postPlatforms as PostPlatform[],
    scheduled_at: (post.scheduled_at as string | null) ?? null,
    created_at: String(post.created_at),
    location: (post.location as string | null) ?? null,
    tags: (post.tags as string[]) ?? [],
    post_tags: normalizedPostTags,
    media_urls: (post.media_urls as string[]) ?? [],
    deleted_at: (post.deleted_at as string | null) ?? null,
    published_platforms: (post.published_platforms as string[]) ?? [],
    external_ids: (post.external_ids as Record<string, string> | null) ?? null,
  };
}
