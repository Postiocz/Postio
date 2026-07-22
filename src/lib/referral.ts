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
 * 30 days of PRO plan (see `rewardReferrer`) and notified by e-mail (see
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
  await admin
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", userId)
    .is("referred_by", null);

  // Reward the referrer: grant 30 days of PRO for each successful referral.
  await rewardReferrer(admin, referrer.id);

  // Notify the referrer by e-mail (best-effort, must never block signup).
  try {
    await sendReferralRewardEmail(admin, referrer.id);
  } catch {
    // Ignore – e-mail delivery must not break account creation.
  }
}

/**
 * Grants the referrer 30 days of PRO plan.
 *
 * - If the referrer is on the **free** plan: upgrade to `pro` and set
 *   `plan_expires_at` to 30 days from now.
 * - If the referrer already has a paid plan (`creator` or `pro`): extend
 *   their `plan_expires_at` by 30 days. If no expiry is set yet (indefinite),
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

  // Extend by 30 days from the later of (current expiry, now).
  const newExpiry = new Date(Math.max(expiresAt.getTime(), now.getTime()));
  newExpiry.setDate(newExpiry.getDate() + 30);

  const update: Record<string, unknown> = {
    plan_expires_at: newExpiry.toISOString(),
  };

  // Free users get upgraded to PRO; paid users keep their plan but get
  // the extra 30 days tacked on.
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
