"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePost, type NormalizedPost } from "./normalize-post";

const PAGE_SIZE = 20;

/**
 * Server action for cursor-based pagination ("Load more" button).
 * Returns the next page of posts appended as NormalizedPost[] plus metadata.
 */
export async function fetchMorePosts(cursor: string): Promise<{
  posts: NormalizedPost[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  let query = supabase
    .from("posts")
    .select("*, post_platforms(*), post_tags(tags(id, name, color))")
    .eq("user_id", user.id)
    .gt("created_at", cursor)
    .order("created_at", { ascending: false });

  const { data: rawPosts, error } = await query.limit(PAGE_SIZE + 1);

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
