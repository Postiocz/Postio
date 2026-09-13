"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateNotifications(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Email notification toggles (sent as "true"/"false" from the client form).
  const emailLowCreditAlert = formData.get("email_low_credit_alert") === "true";
  const emailWeeklySummary = formData.get("email_weekly_summary") === "true";

  const { error } = await supabase
    .from("users")
    .update({
      email_low_credit_alert: emailLowCreditAlert,
      email_weekly_summary: emailWeeklySummary,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings");

  return { error: null, success: true };
}