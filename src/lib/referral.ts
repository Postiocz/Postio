import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sendTransactionalEmail,
  SENDER_HELLO,
  buildReferralRewardEmailHtml,
  getAppBaseUrl,
} from "@/lib/email";
import { REFERRAL_COOKIE } from "./referral-constants";

// Locale messages for e-mail content (loaded directly – next-intl/server
// does not share context in server actions).
import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";
import ukMessages from "@/messages/uk.json";

export { REFERRAL_COOKIE };

type LocaleMessages = typeof csMessages;

function loadLocaleMessages(locale: string): LocaleMessages {
  switch (locale) {
    case "en":
      return enMessages;
    case "uk":
      return ukMessages;
    default:
      return csMessages;
  }
}

function normalizeLocale(value: unknown): "cs" | "en" | "uk" {
  const raw = String(value || "cs");
  return raw === "cs" || raw === "en" || raw === "uk" ? raw : "cs";
}

/**
 * Applies a referral: resolves `refCode` to the inviting user's id and writes
 * it into `referred_by` on the new user's row. Uses the admin (service-role)
 * client so it works even before the new user has an active session (e.g.
 * email-confirmation signups). Idempotent: it never overwrites an already-set
 * `referred_by`, and self-referrals are ignored.
 *
 * When a new referral succeeds, the referrer is automatically rewarded with
 * 7 days of PRO plan (see `rewardReferrer`) and notified by e-mail (see
 * `sendReferralRewardEmail`). Both are best-effort — they must never block
 * account creation.
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

  // Mark the new user as referred (idempotent – only sets if NULL).
  // `.select()` returns the rows actually updated: an empty result means
  // `referred_by` was already set by an earlier call, so we must NOT reward
  // the referrer again (every repeated applyReferral would otherwise stack
  // another +7 days).
  const { data: attributed, error } = await admin
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", userId)
    .is("referred_by", null)
    .select("id");

  if (error || !attributed || attributed.length === 0) return;

  // Reward the referrer: grant 7 days of PRO for each successful referral.
  await rewardReferrer(admin, referrer.id);

  // Notify the referrer by e-mail (best-effort, must never block signup).
  try {
    await sendReferralRewardEmail(admin, referrer.id);
  } catch {
    // Ignore – e-mail delivery must not break account creation.
  }
}

/**
 * Ensures the user has a referral code, generating one if missing.
 *
 * The `handle_new_user()` DB trigger used to generate `referral_code`, but the
 * rewrite in migration 050 dropped that column – so accounts created after it
 * can have NULL. This backfills the code on first access. Returns the code, or
 * null if it could not be read or written.
 */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .single();

  if (existing?.referral_code) return existing.referral_code;

  // Rare: the retry loop guards against a 6-char UNIQUE collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    const { error } = await admin
      .from("users")
      .update({ referral_code: code })
      .eq("id", userId)
      .is("referral_code", null);
    if (!error) return code;
  }

  return null;
}

/**
 * Grants the referrer 7 days of PRO plan for each successful referral.
 *
 * - If the referrer is on the **free** plan: upgrade to `pro` and set
 *   `plan_expires_at` to 7 days from now.
 * - If the referrer already has a paid plan (`creator` or `pro`): extend
 *   their `plan_expires_at` by 7 days. If no expiry is set yet (indefinite),
 *   it starts counting from now.
 *
 * Uses the admin client so this works regardless of who is authenticated.
 */
async function rewardReferrer(
  admin: ReturnType<typeof createAdminClient>,
  referrerId: string,
): Promise<void> {
  const { data: referrer } = await admin
    .from("users")
    .select("plan, plan_expires_at")
    .eq("id", referrerId)
    .single();

  if (!referrer) return;

  const now = new Date();
  const expiresAt = referrer.plan_expires_at
    ? new Date(referrer.plan_expires_at)
    : now;

  // Extend by 7 days from the later of (current expiry, now).
  const newExpiry = new Date(Math.max(expiresAt.getTime(), now.getTime()));
  newExpiry.setDate(newExpiry.getDate() + 7);

  const update: Record<string, unknown> = {
    plan_expires_at: newExpiry.toISOString(),
  };

  // Free users get upgraded to PRO; paid users keep their plan but get
  // the extra 7 days tacked on.
  if (referrer.plan === "free") {
    update.plan = "pro";
  }

  await admin.from("users").update(update).eq("id", referrerId);
}

/**
 * Grants the referrer bonus PRO days after a referred user completes a
 * purchase: **+14 days** when the buyer chose Creator, **+30 days** for Pro.
 * Extends `plan_expires_at` the same way as the registration reward (free →
 * upgrade to `pro`, paid → tack days onto the expiry).
 *
 * Idempotent per buyer: the bonus is claimed by atomically flipping the
 * buyer's `purchase_bonus_granted` flag (only the first claim wins), so a
 * Stripe webhook retry or a repeat checkout can never stack a second reward.
 * Best-effort – never throws, so the webhook stays responsive.
 */
export async function rewardPurchaseBonus(params: {
  admin: ReturnType<typeof createAdminClient>;
  referrerId: string;
  buyerId: string;
  buyerPlan: string | undefined;
}): Promise<void> {
  const { admin, referrerId, buyerId, buyerPlan } = params;

  const bonusDays =
    buyerPlan === "creator" ? 14 : buyerPlan === "pro" ? 30 : 0;
  if (bonusDays === 0) return;

  // Atomic gate: the flag flip only succeeds on the buyer's first claim; an
  // already-granted bonus short-circuits here (empty `claimed`).
  const { data: claimed, error } = await admin
    .from("users")
    .update({ purchase_bonus_granted: true })
    .eq("id", buyerId)
    .eq("referred_by", referrerId)
    .is("purchase_bonus_granted", false)
    .select("id");

  if (error || !claimed || claimed.length === 0) return;

  const { data: referrer } = await admin
    .from("users")
    .select("plan, plan_expires_at")
    .eq("id", referrerId)
    .single();

  if (!referrer) return;

  const now = new Date();
  const expiresAt = referrer.plan_expires_at
    ? new Date(referrer.plan_expires_at)
    : now;

  // Extend from the later of (current expiry, now).
  const newExpiry = new Date(Math.max(expiresAt.getTime(), now.getTime()));
  newExpiry.setDate(newExpiry.getDate() + bonusDays);

  const update: Record<string, unknown> = {
    plan_expires_at: newExpiry.toISOString(),
  };

  if (referrer.plan === "free") {
    update.plan = "pro";
  }

  await admin.from("users").update(update).eq("id", referrerId);
}

/**
 * Sends a branded "reward" e-mail to the referrer after a successful
 * referral. Localised to the referrer's saved language preference.
 *
 * Best-effort: failures are logged but never thrown so the signup flow
 * is never disrupted.
 */
async function sendReferralRewardEmail(
  admin: ReturnType<typeof createAdminClient>,
  referrerId: string,
): Promise<void> {
  // Fetch referrer's language from public.users and email from auth.users.
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin.from("users").select("language").eq("id", referrerId).single(),
    admin.auth.admin.getUserById(referrerId),
  ]);

  if (!authUser?.user?.email) return;

  const locale = normalizeLocale(profile?.language);
  const messages = loadLocaleMessages(locale);
  const reward = messages.email.referralReward;

  const baseUrl = await getAppBaseUrl();
  const appLink = `${baseUrl}/${locale}/dashboard`;

  const html = buildReferralRewardEmailHtml({
    title: reward.title,
    body: reward.body,
    cta: reward.cta,
    appLink,
    footerTagline: messages.email.footerTagline,
  });

  const text = `${reward.title}\n\n${reward.body}\n\n${appLink}`;

  const result = await sendTransactionalEmail({
    to: authUser.user.email,
    subject: reward.subject,
    html,
    text,
    from: SENDER_HELLO,
  });

  if (!result.success) {
    console.error("[referral] Failed to send reward email:", result.error);
  }
}
