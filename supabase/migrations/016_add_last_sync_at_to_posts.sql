-- ============================================================
-- POSTIO – Add last_sync_at column for sync throttling
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
