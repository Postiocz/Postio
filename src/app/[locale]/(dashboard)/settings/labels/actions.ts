"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTag(name: string, color: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("tags")
    .insert({ user_id: user.id, name: name.trim(), color });

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings");

  return { error: null, success: true };
}

export async function deleteTag(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings");

  return { error: null, success: true };
}

export interface UpdateTagResult {
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
  data?: { id: string; name: string; color: string };
}

/**
 * Update an existing tag (name and/or color).
 *
 * Ownership check: only tags owned by the authenticated user can be updated.
 * Returns `alreadyExists: true` if another tag with the same name (case-insensitive)
 * already exists for the user.
 */
export async function updateTag(
  id: string,
  name: string,
  color: string,
): Promise<UpdateTagResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Normalize name: trim + strip leading "#" if present
  const cleanedName = name.trim().replace(/^#/, "");
  if (!cleanedName) {
    return { success: false, error: "Name is required" };
  }

  // Ownership check: confirm the tag belongs to the current user
  const { data: ownedTag } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownedTag) {
    return { success: false, error: "Tag not found" };
  }

  // Duplicate check (case-insensitive) – only consider tags other than the one being edited
  const { data: duplicate } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", cleanedName)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    return { success: false, alreadyExists: true, error: "A tag with this name already exists" };
  }

  // Perform the update – ownership enforced in WHERE clause for defence in depth
  const { data, error } = await supabase
    .from("tags")
    .update({ name: cleanedName, color, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, color")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to update tag" };
  }

  revalidatePath("/settings");

  return { success: true, data: data as { id: string; name: string; color: string } };
}
