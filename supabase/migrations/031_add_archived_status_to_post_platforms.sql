-- ============================================================
-- POSTIO - Add 'archived' status to post_platforms (LinkedIn soft-delete)
-- ============================================================
-- Context: LinkedIn blocks Community Management API access for apps that
-- already expose "Share on LinkedIn". This means Postio cannot verify
-- whether a LinkedIn post still exists on the platform after publishing.
--
-- To prevent accidental duplicate publishes, we add a soft-delete state
-- (`archived`) that:
--   1. Preserves the row (so the user can see history and republish).
--   2. Distinguishes itself from `removed_externally` (which means
--      platform confirmed deletion via API) – archived is a UI-only
--      state meaning "user hid this from their active Postio view".
--
-- Status semantics after this migration:
--   - 'draft'              : created, never published
--   - 'scheduled'          : waiting for publish job
--   - 'publishing'         : currently being uploaded to platform
--   - 'published'          : successfully live on platform
--   - 'failed'             : publish attempt failed
--   - 'removed_externally' : platform API confirmed the post is gone
--   - 'archived' (NEW)     : user soft-deleted from Postio app
--                            (published_at + external_id preserved for
--                            potential restoration)

-- 1. Extend CHECK constraint to allow 'archived'
ALTER TABLE public.post_platforms
  DROP CONSTRAINT IF EXISTS post_platforms_status_check;

ALTER TABLE public.post_platforms
  ADD CONSTRAINT post_platforms_status_check
  CHECK (status IN ('draft','scheduled','publishing','published','failed','removed_externally','archived'));

-- 2. Add archive-tracking columns
ALTER TABLE public.post_platforms
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 3. Index for fast filtering of archived rows in dashboard lists
CREATE INDEX IF NOT EXISTS idx_post_platforms_archived
  ON public.post_platforms(post_id, platform)
  WHERE status = 'archived';

-- 4. Documentation comment
COMMENT ON COLUMN public.post_platforms.archived_at IS 'Timestamp when the user archived (soft-deleted) this platform row from Postio. NULL for active rows.';
COMMENT ON COLUMN public.post_platforms.archive_reason IS 'Why the row was archived. Common values: user_archived_from_app, auto_cleanup.';
COMMENT ON CONSTRAINT post_platforms_status_check ON public.post_platforms IS 'Allowed statuses for a per-platform post row. ''archived'' was added in migration 031 to support LinkedIn soft-delete (CM API not available).';