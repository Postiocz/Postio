-- ============================================================
-- POSTIO – Flash Sales Schema (Prompt 050 KROK 1)
-- ============================================================
-- Přidává časové sloupce pro bleskové akce a izolaci plánů.
-- ============================================================

-- Časové okno pro pricing_plans
ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS active_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT false;

-- Vazba uživatele na konkrétní instanci plánu (akční nabídka)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS current_plan_instance_id UUID REFERENCES public.pricing_plans(id) ON DELETE SET NULL;

-- Indexy pro rychlé vyhledávání aktivních akcí
CREATE INDEX IF NOT EXISTS pricing_plans_active_from_idx ON public.pricing_plans(active_from);
CREATE INDEX IF NOT EXISTS pricing_plans_active_until_idx ON public.pricing_plans(active_until);
CREATE INDEX IF NOT EXISTS pricing_plans_is_promo_idx ON public.pricing_plans(is_promo);

-- Komentáře
COMMENT ON COLUMN public.pricing_plans.active_from IS 'Začátek platnosti akce (TIMESTAMPTZ)';
COMMENT ON COLUMN public.pricing_plans.active_until IS 'Konec platnosti akce (TIMESTAMPTZ)';
COMMENT ON COLUMN public.pricing_plans.is_public IS 'Zobrazit na veřejném webu';
COMMENT ON COLUMN public.pricing_plans.is_promo IS 'Akční nabídka (flash sale)';
COMMENT ON COLUMN public.users.current_plan_instance_id IS 'Aktuální instance akčního plánu uživatele';
