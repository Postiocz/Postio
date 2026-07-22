-- ============================================================
-- POSTIO – Add plan_expires_at to users (Prompt 034)
-- ============================================================
-- Tracks when a paid plan (creator/pro) expires. Used by the
-- referral-reward system to grant 30 days of PRO, and by the
-- billing/account-limits logic to know if a plan has expired.
-- NULL means the plan is active indefinitely (e.g. a founding
-- user) or the user is on Free with no expiry.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
