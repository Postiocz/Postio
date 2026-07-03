-- ============================================================
-- POSTIO - Add metadata JSONB to post_platforms
-- ============================================================

ALTER TABLE public.post_platforms
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
