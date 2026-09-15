-- ============================================================
-- 061 – Analytics: enforce per-target NOT NULL post_platform_id
-- ============================================================
-- Rozhodnutí (2026-09-14): varianta (a) — přepnout post_platform_id
-- na NOT NULL okamžitě, ne spoléhat na aplikační kázeň v Kroku 2.
-- Bezpečné, protože 060 provázela DELETE starých řádků a tabulka je
-- prázdná. Bezpečnostní pojistka: pokud by mezitím někdo zapsal řádek
-- bez post_platform_id (např. starou verzí sync), takový řádek nemá
-- smysl (nemá target) a smaže se před zavedením constraintu.

-- 1. Safety: a row without a target link is meaningless → drop it.
DELETE FROM public.analytics
WHERE post_platform_id IS NULL;

-- 2. Enforce NOT NULL on the per-target key.
ALTER TABLE public.analytics
  ALTER COLUMN post_platform_id SET NOT NULL;

COMMENT ON COLUMN public.analytics.post_platform_id IS
'FK to the concrete post_platforms target this analytics row belongs to. NOT NULL from migration 061 (per-target model).';