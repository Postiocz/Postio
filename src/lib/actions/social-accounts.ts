"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggle the `is_active` flag on a `social_accounts` row owned by the
 * current user. Used by the Facebook Page selector to "tick" which Pages
 * should be enabled for publishing.
 *
 * Security:
 *  - The standard Supabase server client is used, which respects RLS, so
 *    a user can only update rows where `auth.uid() = user_id`.
 *  - We still perform an explicit ownership check for defence in depth and
 *    to return a friendly error message if the account does not exist.
 */
export async function toggleAccountActive(
  accountId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!accountId) {
    return { success: false, error: "Missing accountId" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Ownership check – returns null both when the row does not exist and
  // when it belongs to a different user. We deliberately do not distinguish
  // the two cases in the response so we do not leak row existence.
  const { data: owned, error: ownershipError } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownershipError) {
    return { success: false, error: ownershipError.message };
  }
  if (!owned) {
    return { success: false, error: "Account not found" };
  }

  const { error: updateError } = await supabase
    .from("social_accounts")
    .update({ is_active: isActive })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // The /accounts page renders the active accounts list, so revalidate it
  // (across all locales) so server components re-fetch on next request.
  revalidatePath("/accounts");

  return { success: true };
}
