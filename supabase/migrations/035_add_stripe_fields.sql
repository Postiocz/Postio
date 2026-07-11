-- ============================================================
-- POSTIO – Add Stripe fields to users table
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ;
