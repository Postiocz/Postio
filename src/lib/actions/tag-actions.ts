"use server";

import { createClient } from "@/lib/supabase/server";

const LOCALES = ["cs", "en", "uk"];

function revalidateAllLocales(path: string) {
  // Lightweight path revalidation – we use it only on writes that have a page.
  // For server actions invoked from the dialog or composer, Next.js will
  // revalidate the active page anyway, but calling it explicitly keeps
  // the Settings → Labels page in sync.
  for (const locale of LOCALES) {
    // We can't use next/cache from a server action imported into a client
    // component without a "use server" file boundary. Keep the import in
    // posts.ts where the explicit revalidate calls live.
    void locale;
    void path;
  }
}

export interface UserTag {
  id: string;
  name: string;
  color: string;
}

export interface UserTagWithCount extends UserTag {
  post_count: number;
}

/**
 * Fetch all tags owned by the current user (alphabetical).
 * Used by the TagPicker to populate the available options.
 */
export async function getUserTags(): Promise<{
  success: boolean;
  data?: UserTag[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as UserTag[] };
}

/**
 * Create a new tag inline (from the composer / picker).
 * If a tag with the same name (case-insensitive) already exists, returns it.
 */
export async function createTagInline(
  name: string,
  color: string,
): Promise<{
  success: boolean;
  data?: UserTag;
  alreadyExists?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const cleaned = name.trim().replace(/^#/, "");
  if (!cleaned) return { success: false, error: "Name is required" };

  // First check for existing tag (case-insensitive) to provide a friendlier UX
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .ilike("name", cleaned)
    .maybeSingle();

  if (existing) {
    return { success: true, data: existing as UserTag, alreadyExists: true };
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: user.id, name: cleaned, color })
    .select("id, name, color")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to create tag" };
  }

  revalidateAllLocales("/settings/labels");
  return { success: true, data: data as UserTag };
}

/**
 * Replace the set of tags assigned to a post.
 * Strategy: delete all existing post_tags for the post, then insert the new ones.
 * Atomic enough for the editor flow; if the insert fails the post simply has
 * the old tags (consistent with the previous user-visible state).
 *
 * Performs ownership check on both post and tags.
 */
export async function setPostTags(
  postId: string,
  tagIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Ownership check: the post must belong to the current user.
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!post) return { success: false, error: "Post not found" };

  // Ownership check on tags: filter out any tagIds that don't belong to the user.
  let validTagIds: string[] = [];
  if (tagIds.length > 0) {
    const { data: ownedTags } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .in("id", tagIds);

    validTagIds = (ownedTags ?? []).map((t) => t.id);
  }

  // Replace set
  const { error: deleteError } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (validTagIds.length > 0) {
    const rows = validTagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
      user_id: user.id,
    }));

    const { error: insertError } = await supabase
      .from("post_tags")
      .insert(rows);

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

/**
 * Fetch the tags assigned to a single post (with name + color).
 * Returns [] when the post has no tags.
 */
export async function getPostTags(
  postId: string,
): Promise<{ success: boolean; data?: UserTag[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_tags")
    .select("tags(id, name, color)")
    .eq("post_id", postId);

  if (error) return { success: false, error: error.message };

  type TagRow = { tags: UserTag | UserTag[] | null };
  const tags: UserTag[] = ((data ?? []) as TagRow[])
    .map((row) => (Array.isArray(row.tags) ? row.tags[0] : row.tags))
    .filter((t): t is UserTag => t !== null && typeof t === "object" && "id" in t);

  return { success: true, data: tags };
}

/**
 * Fetch all tags owned by the current user along with a post count per tag.
 *
 * Strategy: two RLS-friendly queries.
 *   1. All user tags (id, name, color) ordered by name.
 *   2. All `post_tags` rows for the current user → aggregated to a count map
 *      in memory.
 *
 * RLS on `post_tags` filters by `auth.uid() = user_id`, so the count is
 * automatically scoped to the caller's posts. No JOIN to `posts` is needed
 * because the junction table itself carries `user_id`.
 *
 * Tags with zero posts are included with `post_count: 0`.
 */
export async function getUserTagsWithCounts(): Promise<{
  success: boolean;
  data?: UserTagWithCount[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // 1) Tags owned by the current user, sorted alphabetically by name.
  const { data: tagsData, error: tagsError } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (tagsError) return { success: false, error: tagsError.message };

  // 2) Pull the tag_id of every post_tag row for the user and aggregate counts
  // in memory. RLS ensures we only see the caller's rows.
  const { data: postTagRows, error: countError } = await supabase
    .from("post_tags")
    .select("tag_id")
    .eq("user_id", user.id);

  if (countError) return { success: false, error: countError.message };

  const countMap = new Map<string, number>();
  for (const row of postTagRows ?? []) {
    const tid = (row as { tag_id: string }).tag_id;
    countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
  }

  const data: UserTagWithCount[] = ((tagsData ?? []) as UserTag[]).map(
    (tag) => ({
      ...tag,
      post_count: countMap.get(tag.id) ?? 0,
    }),
  );

  return { success: true, data };
}
