"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePreferences(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const timezone = formData.get("timezone") as string;
  const timeFormat = formData.get("time_format") as string;
  const startOfWeek = formData.get("start_of_week") as string;
  const defaultPostingTime = formData.get("default_posting_time") as string;

  const { error } = await supabase
    .from("users")
    .update({
      timezone: timezone || "Europe/Prague",
      time_format: timeFormat || "24",
      start_of_week: startOfWeek || "monday",
      default_posting_time: defaultPostingTime || "09:00",
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings");

  return { error: null, success: true };
}
