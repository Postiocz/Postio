-- ============================================================
-- POSTIO – Add deleted_at to posts table (soft-delete support)
-- ============================================================
-- Context: Prompt 030 – Historical footprints for deleted posts.
-- Instead of hard-deleting posts from the DB, we soft-delete them
-- by setting a deleted_at timestamp and clearing media_urls.
--
-- Note: posts.status column was dropped in migration 025 (status is
-- computed from post_platforms). post_platforms.status CHECK constraint
-- already includes 'archived' (migration 031) — no constraint change needed.
--
-- This enables the calendar to keep showing deleted posts as
-- read-only "footprints" for historical overview.

-- 1. Add deleted_at column for soft-delete tracking
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Index for efficient filtering of archived/deleted posts
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at
  ON public.posts(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Documentation
COMMENT ON COLUMN public.posts.deleted_at IS
  'Timestamp when the post was soft-deleted (archived). NULL for active posts. Set automatically by the app when user deletes a post.';
