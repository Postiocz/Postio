-- ============================================================
-- POSTIO – Add 'removed_externally' status + tracking columns
-- ============================================================

-- 1. Extend the CHECK constraint on posts.status to include 'removed_externally'
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'removed_externally'));

-- 2. Add tracking columns for externally removed posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_from_platform TEXT;

-- Index for efficient filtering of removed posts
CREATE INDEX IF NOT EXISTS posts_removed_at_idx ON public.posts(removed_at) WHERE removed_at IS NOT NULL;
