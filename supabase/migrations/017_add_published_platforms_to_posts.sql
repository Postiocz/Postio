-- ============================================================
-- POSTIO – Add published_platforms to posts
-- Track which platforms a post has been published to, enabling
-- "additional publishing" (publish to more platforms later).
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS published_platforms TEXT[] DEFAULT '{}';
