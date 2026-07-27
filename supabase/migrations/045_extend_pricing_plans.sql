-- ============================================================
-- POSTIO – Pricing Plans Extension (Prompt 048 KROK 6)
-- ============================================================
-- Rozšíření tabulky pricing_plans o nové funkce:
-- - is_visible: zobrazení/skrytí plánu
-- - is_custom: vlastní editovatelný plán
-- - max_subscriptions: limit pro omezené akce
-- - current_subscriptions: aktuální počet předplatných
-- - name_en, name_uk: lokalizované názvy pro vlastní plány
-- ============================================================

-- Přidej nové sloupce
ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_subscriptions INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_subscriptions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_uk TEXT;

-- Komentáře k novým sloupcům
COMMENT ON COLUMN public.pricing_plans.is_visible IS 'Zda je plán viditelný na landing page a v aplikaci';
COMMENT ON COLUMN public.pricing_plans.is_custom IS 'Vlastní editovatelný plán (ne master template)';
COMMENT ON COLUMN public.pricing_plans.max_subscriptions IS 'Maximální počet předplatných pro limitovanou akci (NULL = neomezeno)';
COMMENT ON COLUMN public.pricing_plans.current_subscriptions IS 'Aktuální počet aktivních předplatných';
COMMENT ON COLUMN public.pricing_plans.name_en IS 'Anglický název plánu (pro vlastní plány)';
COMMENT ON COLUMN public.pricing_plans.name_uk IS 'Ukrajinský název plánu (pro vlastní plány)';

-- Index pro rychlé vyhledávání viditelných plánů
CREATE INDEX IF NOT EXISTS pricing_plans_is_visible_idx ON public.pricing_plans(is_visible);

-- Index pro vlastní plány
CREATE INDEX IF NOT EXISTS pricing_plans_is_custom_idx ON public.pricing_plans(is_custom);
