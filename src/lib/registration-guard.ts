import { createAdminClient } from "@/lib/supabase/server";

// Anti-abuse knobs:
// - MAX_ACCOUNTS_PER_IP: how many registrations from one IP are allowed
//   inside the window before we hard-block further account creation..
// - MAX_BONUS_BYPASS: if an IP is already on file but under the hard cap,
//   the account is still created, but the referrer gets no reward for it..
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS_PER_IP = 2;

export type RegistrationGuardResult =
  | { allowed: true; grantReferralBonus: boolean }
  | { allowed: false; errorKey: "tooManyAccounts" };

/**
 * Extracts the client IP from the incoming request. Prefers the first
 * entry of `x-forwarded-for` (the original client), falls back to
 * `x-real-ip`. Returns null when unavailable (can't verify – treated as
 * allowed so a missing header never blocks a legit signup).
 */
export function getClientIp(
  headerValue: string | null,
  realIpValue: string | null
): string | null {
  if (headerValue) {
    const first = headerValue.split(",")[0]?.trim();
    if (first && !first.includes("unknown")) return first;
  }
  return realIpValue?.trim() || null;
}

/**
 * Developer bypass: when the app runs in development mode, or the request
 * carries the `admin_token` query parameter matching `ADMIN_BYPASS_TOKEN`,
 * the IP guard is skipped entirely. This keeps local testing usable for
 * devs on dynamic/rotating IPs (the user's case) while production stays safe.


 */
export function isAdminBypass(url: URL | null): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const expected = process.env.ADMIN_BYPASS_TOKEN;  if (!url || !expected) return false;
  return url.searchParams.get("admin_token") === expected;
}

/**
 * Decides whether a registration from `ip` is allowed and, if so, whether
 * the referrer may still claim their reward for this account..
 *
 * - Dev mode or valid `admin_token` (bypass): allowed, bonus granted..
 * - No IP (unverified): allowed, bonus granted..
 * - First registration: allowed, bonus granted..
 * - Second registration in the window: allowed, but the referral bonus is
 *   withheld (the IP is already on file → likely scripted abuse).
 * - Third+ registration in the window: blocked outright..
 */
export async function checkRegistrationIp(
  ip: string | null
): Promise<RegistrationGuardResult> {
  if (!ip) return { allowed: true, grantReferralBonus: true };

  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data, error } = await admin
    .from("registration_logs")
    .select("id")
    .eq("ip_address", ip)
    .gte("created_at", since);

  // On DB failure be permissive – never break account creation because the
  // guard itself is broken..
  if (error || !data) return { allowed: true, grantReferralBonus: true };

  if (data.length >= MAX_ACCOUNTS_PER_IP) {
    return { allowed: false, errorKey: "tooManyAccounts" };
  }
  if (data.length >= 1) {
    return { allowed: true, grantReferralBonus: false };
  }
  return { allowed: true, grantReferralBonus: true };
}

/**
 * Persists the IP behind a newly created account. Best-effort – a failure
 * here (or a null IP) must never bubble up and break the signup flow..
 */
export async function logRegistration(
  ip: string | null,
  userId: string
): Promise<void> {
  if (!ip) return;
  try {
    const admin = createAdminClient();
    await admin.from("registration_logs").insert({
      ip_address: ip,
      user_id: userId,
    });
  } catch {
    // Guard must never block account creation..
  }
}