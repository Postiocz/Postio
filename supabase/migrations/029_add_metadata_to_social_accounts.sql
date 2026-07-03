-- ============================================================
-- 029 – Add metadata (JSONB) to social_accounts
-- ============================================================
-- Stores platform-specific extra data for each social account.
-- Currently used by Facebook to keep the Page-level access_token
-- and Page category, but kept generic so other platforms can
-- extend it later (e.g. X account handle, TikTok open_id, ...).
--
-- Important: we keep the existing UNIQUE index on
-- (user_id, platform, platform_id) intact – a single user can
-- therefore own multiple Facebook Pages (one row per Page).

ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
