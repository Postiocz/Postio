import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Plan → maximum number of *connected* (active) social accounts.
 * Matches the product plan table: Free = 1, Creator = 5, Pro = unlimited.
 * `Infinity` is used for Pro so the comparison logic stays uniform.
 */
export const ACCOUNT_LIMITS = {
  free: 1,
  creator: 5,
  pro: Infinity,
} as const;

export type Plan = keyof typeof ACCOUNT_LIMITS;

export interface AccountLimitInfo {
  plan: Plan;
  /** Infinity for the Pro plan. */
  limit: number;
  /** Number of currently active (connected) accounts for the user. */
  activeCount: number;
}

/**
 * Resolve the user's plan and count their currently active connected accounts.
 *
 * The active count uses `is_active = true`, which is exactly what the
 * /accounts UI shows as "connectedAccounts" (`accounts.filter(a => a.is_active).length`),
 * so enforcement and UI stay consistent.
 *
 * Reads via the provided client (regular or admin). When using the regular
 * RLS-scoped client the caller must already be authenticated; when using the
 * admin client the caller must filter by `user_id` itself.
 */
export async function getAccountLimitInfo(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountLimitInfo> {
  const { data: userData } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = ((userData?.plan as Plan) ?? "free") as Plan;
  const limit = ACCOUNT_LIMITS[plan];

  const { count } = await supabase
    .from("social_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  return { plan, limit, activeCount: count ?? 0 };
}

/**
 * Decide whether connecting `(platform, platformId)` for `userId` is allowed
 * under the plan limit.
 *
 * A reconnect of an EXISTING account (same `user_id` + `platform` +
 * `platform_id`) never increases the active count, so it is always allowed
 * even when the user is already at the limit. This prevents the limit from
 * blocking legitimate token refreshes / re-linking of the same account.
 *
 * Genuinely new accounts are blocked once `activeCount >= limit`.
 */
export async function isNewAccountAllowed(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
  platformId?: string | null,
): Promise<{ allowed: boolean; info: AccountLimitInfo }> {
  const info = await getAccountLimitInfo(supabase, userId);
  if (info.limit === Infinity) return { allowed: true, info };

  // Reconnect of an existing account does not consume a slot.
  if (platformId) {
    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", platform)
      .eq("platform_id", platformId)
      .maybeSingle();
    if (existing) return { allowed: true, info };
  }

  if (info.activeCount >= info.limit) return { allowed: false, info };
  return { allowed: true, info };
}

/**
 * Build a user-facing message explaining that the plan account limit was hit.
 * Intended to be passed as the `?error=` query param (rendered by the
 * /accounts page) or returned in a JSON/action error payload.
 */
export function accountLimitErrorMessage(info: AccountLimitInfo): string {
  const planName = info.plan.charAt(0).toUpperCase() + info.plan.slice(1);
  const noun = info.limit === 1 ? "account" : "accounts";
  const limitText = info.limit === Infinity ? "unlimited" : String(info.limit);
  return `Account limit reached for ${planName} plan (max ${limitText} connected ${noun}). Upgrade your plan to connect more.`;
}
