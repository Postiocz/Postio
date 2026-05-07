"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOrganizationName(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized", success: false };
    }

    const organizationName = formData.get("organization_name") as string;

    const { error } = await supabase
      .from("users")
      .update({ organization_name: organizationName || null })
      .eq("id", user.id);

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/settings/general");
    return { error: null, success: true };
  } catch {
    return { error: "Internal server error", success: false };
  }
}
