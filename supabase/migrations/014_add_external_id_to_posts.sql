-- ============================================================
-- 14. Add external_id column to posts table
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL;
