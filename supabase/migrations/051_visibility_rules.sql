-- ============================================================
-- POSTIO – Visibility Rules (Prompt 058 KROK 1)
-- ============================================================
-- Nahrazuje hrubý flag is_new_user_only flexibilním systémem
-- cílených skupin. Sloupec `visibility_rules` (TEXT[]) říká,
-- komu (kterým skupinám uživatelů) se plán zobrazí a může být
-- zakoupen.
--
-- Hodnoty v poli:
--   'anonymous' – neregistrovaní návštěvníci (Landing Page)
--   'free'      – uživatelé s tarifem Free
--   'creator'   – uživatelé s tarifem Creator
--   'pro'       – uživatelé s tarifem Pro
-- ============================================================

-- 1. Přidat sloupec visibility_rules (TEXT[], prázdné pole default)
ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS visibility_rules TEXT[] NOT NULL DEFAULT '{}';

-- 2. Backfill existujících plánů:
--    a) Master šablony (Free/Creator/Pro) → všechny skupiny
UPDATE public.pricing_plans
SET visibility_rules = ARRAY['anonymous','free','creator','pro']
WHERE is_master_template = true;

--    b) Promo plánys (is_promo = true) → pouze noví (neregistrovaní na webu)
UPDATE public.pricing_plans
SET visibility_rules = ARRAY['anonymous']
WHERE is_promo = true;

--    c) Ostatní viditelné custom plány → anonymní (veřejné na webu)
UPDATE public.pricing_plans
SET visibility_rules = ARRAY['anonymous']
WHERE visibility_rules = '{}' AND is_visible = true;

-- 3. Index pro rychlé filtrování (pokud se někdy dotazuje na obsah pole)
CREATE INDEX IF NOT EXISTS pricing_plans_visibility_rules_idx
  ON public.pricing_plans USING GIN (visibility_rules);

-- 4. Komentář ke sloupci
COMMENT ON COLUMN public.pricing_plans.visibility_rules IS
  'Cílené skupiny uživatelů, kterým se plán zobrazí (anonymous|free|creator|pro). Master šablony: vše. Promo: jen anonymous.';