-- ============================================================
-- 036 – Add publishing_type to social_accounts + 'ready' status to post_platforms
-- ============================================================
-- Manual publishing support (Prompt 026): personal profiles (Instagram,
-- Facebook) that cannot be published via API get publishing_type='manual'.
-- Postio then prepares the post and reminds the user instead of calling the API.
--
-- 'ready' is the post_platforms status meaning "Připraveno ke zveřejnění"
-- (prepared, awaiting the user to publish manually on the platform).

-- 1. publishing_type on social_accounts (default 'direct' = backward compatible).
ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS publishing_type TEXT NOT NULL DEFAULT 'direct'
CHECK (publishing_type IN ('direct', 'manual'));

-- 2. Extend post_platforms status CHECK to allow the new 'ready' status.
--    Mirrors migration 031 (which added 'archived').
ALTER TABLE public.post_platforms
DROP CONSTRAINT IF EXISTS post_platforms_status_check;

ALTER TABLE public.post_platforms
ADD CONSTRAINT post_platforms_status_check
CHECK (status IN ('draft','scheduled','publishing','published','failed','removed_externally','archived','ready'));

COMMENT ON CONSTRAINT post_platforms_status_check ON public.post_platforms IS
'Allowed statuses for a per-platform post row. ''ready'' added in migration 036 for manual-publishing support (Prompt 026).';
