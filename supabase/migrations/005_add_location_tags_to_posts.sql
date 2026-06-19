-- ============================================================
-- 5. Add location and tags columns to posts table
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
