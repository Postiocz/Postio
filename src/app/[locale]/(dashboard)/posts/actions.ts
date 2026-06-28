"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePost, type NormalizedPost } from "./normalize-post";

const PAGE_SIZE = 20;

/**
 * Shared filter params for both initial fetch and "Load more".
 * Empty string means "no filter" (all values).
 */
export interface PostFilters {
  platform?: string; // e.g. "instagram", "facebook", ""
  status?: string;   // e.g. "draft", "published", ""
  tagId?: string;    // tag UUID, "" = no filter
}

/**
 * Resolve the set of post_ids that match the given filters.
 * Returns `undefined` (no restriction) when all filters are empty.
 *
 * Uses subqueries on `post_platforms` and `post_tags` join tables
 * because Supabase REST doesn't support nested subqueries in `.select()`.
 */
async function getFilteredPostIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  filters?: PostFilters,
): Promise<string[] | undefined> {
  // If no filters are active, return undefined (no ID restriction)
  const hasFilters = !!(
    filters?.platform ||
    filters?.status ||
    filters?.tagId
  );
  if (!hasFilters) return undefined;

  // Start with all user post_ids
  let postIds: Set<string> | undefined = undefined;

  const addFilter = async (ids: string[]) => {
    if (postIds === undefined) {
      postIds = new Set(ids);
    } else {
      // Intersect with existing set
      const filterSet = new Set(ids);
      postIds = new Set(
        [...postIds].filter((id) => filterSet.has(id)),
      );
    }
  };

  // Platform filter — posts that have at least one post_platforms row
  // with the target platform
  if (filters?.platform) {
    const { data: ppRows, error: ppErr } = await supabase
      .from("post_platforms")
      .select("post_id")
      .eq("platform", filters.platform);

    if (!ppErr && ppRows) {
      if (ppRows.length === 0) return []; // short-circuit: no matches
      await addFilter(ppRows.map((r) => r.post_id));
    }
  }

  // Status filter — posts where at least one post_platform has this status.
  // Note: this is a simplified match against raw post_platforms.status,
  // not the computed multi-platform status from normalizePost().
  if (filters?.status) {
    const { data: ppRows, error: ppErr } = await supabase
      .from("post_platforms")
      .select("post_id")
      .eq("status", filters.status);

    if (!ppErr && ppRows) {
      if (ppRows.length === 0) return [];
      await addFilter(ppRows.map((r) => r.post_id));
    }
  }

  // Tag filter — posts linked to the given tag via post_tags
  if (filters?.tagId) {
    const { data: ptRows, error: ptErr } = await supabase
      .from("post_tags")
      .select("post_id")
      .eq("tag_id", filters.tagId);

    if (!ptErr && ptRows) {
      if (ptRows.length === 0) return [];
      await addFilter(ptRows.map((r) => r.post_id));
    }
  }

  // If we collected no filters at all, fall back to undefined
  if (postIds === undefined) return undefined;
  return [...postIds];
}

/**
 * Fetch a page of posts with optional cursor + server-side filters.
 * Shared internal implementation for both fetchMorePosts and fetchFilteredPosts.
 */
async function fetchPostPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cursor?: string,
  filters?: PostFilters,
) {
  // Resolve filtered post_ids (may be undefined = no filter)
  const filteredIds = await getFilteredPostIds(supabase, userId, filters);

  let query = supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Apply cursor (for "Load more")
  if (cursor) {
    query = query.gt("created_at", cursor);
  }

  // Apply ID filter (intersection of platform + status + tag)
  if (filteredIds !== undefined) {
    if (filteredIds.length === 0) {
      return { rawPosts: [] as any[], error: null, totalCount: 0 };
    }
    query = query.in("id", filteredIds);
  }

  const { data: rawPosts, error } = await query.limit(PAGE_SIZE + 1);

  // Fetch total count for "X z Y" header
  let totalCount = 0;
  if (!error && rawPosts) {
    let countQuery = supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (filteredIds !== undefined) {
      if (filteredIds.length === 0) {
        totalCount = 0;
      } else {
        countQuery = countQuery.in("id", filteredIds);
      }
    }

    const { count, error: countErr } = await countQuery;
    if (!countErr && count != null) {
      totalCount = count;
    }
  }

  return { rawPosts, error, totalCount };
}

/**
 * Server action for cursor-based pagination ("Load more" button).
 * Returns the next page of posts appended as NormalizedPost[] plus metadata.
 *
 * @param cursor - `created_at` of the last visible row
 * @param filters - optional server-side filters (platform, status, tag)
 */
export async function fetchMorePosts(
  cursor: string,
  filters?: PostFilters,
): Promise<{
  posts: NormalizedPost[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const { rawPosts, error } = await fetchPostPage(
    supabase,
    user.id,
    cursor,
    filters,
  );

  if (error || !rawPosts) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const hasMore = rawPosts.length > PAGE_SIZE;
  const pagedPosts = rawPosts.slice(0, PAGE_SIZE);

  const normalized = pagedPosts.map(normalizePost);

  const nextCursor =
    pagedPosts.length >= PAGE_SIZE
      ? pagedPosts[pagedPosts.length - 1]?.created_at ?? null
      : null;

  return { posts: normalized, hasMore, nextCursor };
}

/**
 * Server action that fetches the **first page** of posts with optional
 * server-side filters. Used when the user changes a filter on the client —
 * replaces the entire in-memory list instead of filtering locally.
 *
 * Also returns `totalCount` (matching the current filters) so the header
 * can display "3 z 47 příspěvků".
 */
export async function fetchFilteredPosts(
  filters?: PostFilters,
): Promise<{
  posts: NormalizedPost[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { posts: [], hasMore: false, nextCursor: null, totalCount: 0 };
  }

  const { rawPosts, error, totalCount } = await fetchPostPage(
    supabase,
    user.id,
    undefined, // first page — no cursor
    filters,
  );

  if (error || !rawPosts) {
    return { posts: [], hasMore: false, nextCursor: null, totalCount: 0 };
  }

  const hasMore = rawPosts.length > PAGE_SIZE;
  const pagedPosts = rawPosts.slice(0, PAGE_SIZE);

  const normalized = pagedPosts.map(normalizePost);

  const nextCursor =
    pagedPosts.length >= PAGE_SIZE
      ? pagedPosts[pagedPosts.length - 1]?.created_at ?? null
      : null;

  return { posts: normalized, hasMore, nextCursor, totalCount };
}
