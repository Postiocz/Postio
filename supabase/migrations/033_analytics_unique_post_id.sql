-- ============================================================
-- POSTIO - Add UNIQUE constraint on post_id in analytics table
-- Enables safe upsert (ON CONFLICT) for real analytics sync.
-- ============================================================

ALTER TABLE public.analytics
  ADD CONSTRAINT analytics_post_id_unique UNIQUE (post_id);
