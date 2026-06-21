"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const LOCALES = ["cs", "en", "uk"];

function revalidateAllLocales(path: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`);
  }
}

export async function createTemplate(data: { name: string; content: string }) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name: data.name,
      content: data.content,
      is_premium: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/templates");
  return { success: true, data: template };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // RLS ensures a user can only delete their own templates; the
  // explicit user_id filter is belt-and-braces and also gives the
  // query planner a chance to use the index.
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: error.message };
  }

  revalidateAllLocales("/templates");
  return { success: true };
}

