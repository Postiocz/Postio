-- ============================================================
-- 013 – Fix social_accounts RLS + ensure upsert works
-- ============================================================

-- Drop existing policies to recreate with proper permissions
DROP POLICY IF EXISTS "Users can view own accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.social_accounts;

-- Recreate policies with auth.uid() = user_id
CREATE POLICY "Users can view own accounts"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.social_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON public.social_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Ensure unique index for upsert exists
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_platform_id_key
  ON public.social_accounts (user_id, platform, platform_id);

-- Ensure all required columns exist
ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS platform_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure platform constraint includes all platforms
ALTER TABLE public.social_accounts
DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE public.social_accounts
ADD CONSTRAINT social_accounts_platform_check
CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'));
