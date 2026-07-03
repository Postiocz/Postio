-- ============================================================
-- 012 – social_accounts: avatar_url + platform constraint + upsert key
-- ============================================================

ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.social_accounts
DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE public.social_accounts
ADD CONSTRAINT social_accounts_platform_check
CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'));

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_platform_id_key
ON public.social_accounts (user_id, platform, platform_id);

