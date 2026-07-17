import { createAdminClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE } from "./referral-constants";

export { REFERRAL_COOKIE };

/**
 * Applies a referral: resolves `refCode` to the inviting user's id and writes
 * it into `referred_by` on the new user's row. Uses the admin (service-role)
 * client so it works even before the new user has an active session (e.g.
 * email-confirmation signups). Idempotent: it never overwrites an already-set
 * `referred_by`, and self-referrals are ignored.
 */
export async function applyReferral(refCode: string, userId: string): Promise<void> {
  const code = refCode.trim().toUpperCase();
  if (!code) return;

  const admin = createAdminClient();

  const { data: referrer } = await admin
    .from("users")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  // Unknown code, or the user referred themselves: nothing to do.
  if (!referrer || referrer.id === userId) return;

  await admin
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", userId)
    .is("referred_by", null);
}
