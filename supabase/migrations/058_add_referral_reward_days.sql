-- ============================================================
-- POSTIO – Referral reward length marker
-- ============================================================
-- Records how many days a granted referral reward lasts on the referrer's
-- account, so the "Aktuální čerpání" widget can show credit totals
-- proportional to the reward instead of the full plan allowance:
--   7 days  -> 2 AI + 2 X credits
--   10 days -> 3 AI + 3 X credits
--   14 days -> 5 AI + 5 X credits
-- A NULL value means the user has no (active) referral reward and keeps the
-- full limits of their current plan.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_reward_days integer;