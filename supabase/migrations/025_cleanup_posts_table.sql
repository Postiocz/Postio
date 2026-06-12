-- ============================================================
-- POSTIO - Cleanup posts table (Phase 4)
-- ============================================================

-- 1. Drop old RPC functions that rely on dropped columns
DROP FUNCTION IF EXISTS public.append_published_platform(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.remove_published_platform(UUID, TEXT, UUID);

-- 2. Drop columns from posts
ALTER TABLE public.posts
  DROP COLUMN IF EXISTS platforms,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS scheduled_at,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS published_platforms,
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS external_ids,
  DROP COLUMN IF EXISTS publish_error,
  DROP COLUMN IF EXISTS removed_at,
  DROP COLUMN IF EXISTS removed_from_platform,
  DROP COLUMN IF EXISTS last_sync_at;
