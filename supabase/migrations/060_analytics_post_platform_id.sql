-- ============================================================
-- 060 – Analytics per-target: post_platform_id místo agregované post_id
-- ============================================================
-- Přechod z agregovaného modelu (1 řádek na post_id, sčítá FB+IG
-- dohromady) na per-target model (1 řádek na post_platform_id,
-- každá platforma/účet zvlášť).
--
-- 1. Zrušíme UNIQUE(post_id) – v per-target modelu má multi-platform
--    post 2+ řádků se stejným post_id; kdyby constraint zůstal, druhý
--    insert pro tentýž post by selhal.
-- 2. Nový sloupec post_platform_id (FK na post_platforms, NULLABLE
--    pro bezpečný přechod – NULL = staré/nezařazené řádky).
-- 3. UNIQUE(post_platform_id) – použitelný jako ON CONFLICT target.
--    Postgres UNIQUE povolí víc NULL řádků, takže přechod neruší data.
-- 4. post_id zůstává běžný (ne U-KEY) sloupec; běžný index
--    analytics_post_id_idx (z 001) zůstává pro lookupy podle postu.
-- 5. RLS politiky (001) se váží přes posts.post_id = analytics.post_id
--    a zůstávají platné beze změny (post_id se nemění).

-- 1. Drop the old per-post UNIQUE (aggregated model).
ALTER TABLE public.analytics
  DROP CONSTRAINT IF EXISTS analytics_post_id_unique;

-- 2. Add nullable FK to the concrete platform-target row.
ALTER TABLE public.analytics
  ADD COLUMN IF NOT EXISTS post_platform_id UUID
  REFERENCES public.post_platforms (id) ON DELETE CASCADE;

-- 3. Enforce 1 analytics row per platform-target (uppser target).
ALTER TABLE public.analytics
  DROP CONSTRAINT IF EXISTS analytics_post_platform_id_unique;

ALTER TABLE public.analytics
  ADD CONSTRAINT analytics_post_platform_id_unique
  UNIQUE (post_platform_id);

COMMENT ON COLUMN public.analytics.post_platform_id IS
'FK to the concrete post_platforms target this analytics row belongs to (per-target model). Added in migration 060.';