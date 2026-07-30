-- ============================================================
-- POSTIO – Badge Translation Columns (Prompt 053 KROK 1)
-- ============================================================
-- Přidává chybějící sloupce pro překlady badge_text
-- ============================================================

ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS badge_text_en TEXT,
ADD COLUMN IF NOT EXISTS badge_text_uk TEXT;

COMMENT ON COLUMN public.pricing_plans.badge_text_en IS 'Anglický překlad textu odznaku';
COMMENT ON COLUMN public.pricing_plans.badge_text_uk IS 'Ukrajinský překlad textu odznaku';
