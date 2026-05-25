-- ============================================================
-- 13. Add publish_error column to posts table
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS publish_error TEXT DEFAULT NULL;

