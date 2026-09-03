-- ============================================================
-- POSTIO – Purchase bonus idempotency flag
-- ============================================================
-- Ensures the referrer's +14 (Creator) / +30 (Pro) day bonus for a referred
-- purchase is granted exactly once per buyer. Without this, a Stripe webhook
-- retry or a repeat checkout would stack a second reward on the referrer.
-- The flag is flipped atomically inside the grant UPDATE (guarded by
-- `purchase_bonus_granted = false`), so only the first claim wins.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS purchase_bonus_granted boolean NOT NULL DEFAULT false;