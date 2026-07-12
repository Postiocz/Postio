-- ============================================================
-- 037 – Add account_id FK to post_platforms (multi-account support)
-- ============================================================
-- Prompt 026 (Krok 4.1): the original schema assumed 1 account per
-- platform. post_platforms only referenced the platform *string*, so the
-- same user could never connect two accounts of the same network (e.g.
-- 2x Facebook) and the publish motor could not target a specific account.
--
-- This migration links each post_platforms row to a concrete
-- social_accounts row via account_id, enabling:
--   * multiple accounts of the same platform per user,
--   * editor choice of which account to publish to,
--   * publish motor targeting the exact account (Krok 4.2).

-- 1. Add the nullable FK column (nullable so backfill + orphans are safe).
ALTER TABLE public.post_platforms
ADD COLUMN IF NOT EXISTS account_id UUID
REFERENCES public.social_accounts (id) ON DELETE CASCADE;

-- 2. Backfill existing rows: match by platform (1:1 today).
--    Correlated subquery picks the most recently created matching account.
UPDATE public.post_platforms pp
SET account_id = (
  SELECT sa.id
  FROM public.social_accounts sa
  WHERE sa.user_id = (SELECT p.user_id FROM public.posts p WHERE p.id = pp.post_id)
    AND sa.platform = pp.platform
    AND sa.is_active = true
  ORDER BY sa.created_at DESC
  LIMIT 1
)
WHERE pp.account_id IS NULL;

-- 3. Index for fast lookups by account (used by publish motor + widgets).
CREATE INDEX IF NOT EXISTS post_platforms_account_id_idx
ON public.post_platforms (account_id);

-- 4. Prevent publishing the SAME post to the SAME account twice.
--    Only one row per (post_id, account_id); nullable account_id still
--    allows legacy/unmatched rows (unique ignores NULLs in Postgres).
ALTER TABLE public.post_platforms
DROP CONSTRAINT IF EXISTS post_platforms_post_account_unique;

ALTER TABLE public.post_platforms
ADD CONSTRAINT post_platforms_post_account_unique
UNIQUE (post_id, account_id);

COMMENT ON COLUMN public.post_platforms.account_id IS
'FK to the concrete social_accounts row this platform-target belongs to. Added in migration 037 (Prompt 026, Krok 4.1) to support multiple accounts of the same platform.';
