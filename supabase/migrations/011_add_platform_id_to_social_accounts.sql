-- ============================================================
-- 011 – Add platform_id to social_accounts
-- ============================================================
-- platform_id stores the Facebook Page ID or Instagram Account ID
-- required for publishing content via Graph API.

ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS platform_id TEXT;
