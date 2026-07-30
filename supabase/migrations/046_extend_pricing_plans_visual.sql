-- ============================================================
-- POSTIO – Pricing Plans Visual Extension (Prompt 051 KROK 1)
-- ============================================================
-- Přidává sloupce pro vizuální prvky tarifů:
-- description, badge, is_recommended, badge_color + překlady
-- ============================================================

-- Přidej nové sloupce do pricing_plans
ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_uk TEXT,
ADD COLUMN IF NOT EXISTS badge_text TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '#6366F1';

-- Komentáře k novým sloupcům
COMMENT ON COLUMN public.pricing_plans.description IS 'Drobný popisek pod názvem plánu (např. "Pro tvůrce obsahu")';
COMMENT ON COLUMN public.pricing_plans.description_en IS 'Anglický překlad popisku';
COMMENT ON COLUMN public.pricing_plans.description_uk IS 'Ukrajinský překlad popisku';
COMMENT ON COLUMN public.pricing_plans.badge_text IS 'Text odznaku (např. "Doporučujeme")';
COMMENT ON COLUMN public.pricing_plans.is_recommended IS 'Zda se má odznak zobrazit';
COMMENT ON COLUMN public.pricing_plans.badge_color IS 'Barva odznaku v hex formátu (např. #6366F1)';

-- Aktualizuj master templates s výchozími hodnotami
UPDATE public.pricing_plans
SET
  description = CASE type
    WHEN 'free' THEN 'Pro začátečníky'
    WHEN 'creator' THEN 'Pro tvůrce obsahu'
    WHEN 'pro' THEN 'Pro profesionály'
  END,
  is_recommended = CASE type WHEN 'creator' THEN true ELSE false END,
  badge_text = CASE type WHEN 'creator' THEN 'Doporučujeme' ELSE '' END,
  badge_color = CASE type WHEN 'creator' THEN '#6366F1' WHEN 'pro' THEN '#8B5CF6' ELSE '#6366F1' END
WHERE is_master_template = true;
