"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Prompt 044-REVISED KROK 4.3: Submit Feedback
 * Saves user feedback to the database.
 */
export async function submitFeedback({
  type,
  message,
}: {
  type: "bug" | "feature" | "other";
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    type,
    message,
    status: "new",
  });

  if (error) {
    console.error("[submitFeedback] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all feedback for admin view.
 * Uses admin client to bypass RLS.
 */
export async function getFeedbackList() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("feedback")
    .select(`
      id,
      message,
      type,
      status,
      created_at,
      user_id
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[getFeedbackList] Error:", error.message || error);
    return [];
  }

  return data ?? [];
}

/**
 * Update feedback status.
 * Uses admin client to bypass RLS.
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: "new" | "read" | "resolved"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", feedbackId);

  if (error) {
    console.error("[updateFeedbackStatus] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
