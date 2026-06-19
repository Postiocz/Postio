-- ============================================================
-- 027 – Add token_expires_at to social_accounts
-- ============================================================
-- Stores OAuth token expiry for platforms that use short-lived
-- tokens (e.g. LinkedIn = 60 days).

ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
