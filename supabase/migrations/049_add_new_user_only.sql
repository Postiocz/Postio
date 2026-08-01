-- ============================================================
-- POSTIO – New User Only flag (Prompt 057 KROK 1)
-- ============================================================
-- Označuje plány určené VÝHRADNĚ pro nové uživatele (typicky promo akce).
-- Stávající uživatelé tyto plány nevidí ani si je nemohou koupit.
-- ============================================================

-- 1. Přidej sloupec is_new_user_only
ALTER TABLE public.pricing_plans
ADD COLUMN IF NOT EXISTS is_new_user_only BOOLEAN DEFAULT false;

-- 2. Backfill: všechny promo plány jsou defaultně "nový uživatel only"
UPDATE public.pricing_plans
SET is_new_user_only = true
WHERE is_promo = true;

-- 3. Index pro rychlé filtrování
CREATE INDEX IF NOT EXISTS pricing_plans_is_new_user_only_idx
  ON public.pricing_plans(is_new_user_only);

-- 4. Komentář
COMMENT ON COLUMN public.pricing_plans.is_new_user_only IS 'Plán určený pouze pro nové uživatele (promo akce) – stávající uživatelé ho nevidí a nemohou ho koupit';
