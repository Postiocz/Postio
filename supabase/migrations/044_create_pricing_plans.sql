-- ============================================================
-- POSTIO – Pricing Plans Table (Prompt 048 KROK 2)
-- ============================================================
-- Tabulka pro správu dynamických tarifů s ochranou původních hodnot.
--
-- Klíčové koncepty:
-- - is_master_template = true → Nedotknutelný originál (master)
-- - is_active = true → Aktuálně aktivní verze tarifu
-- - Historie změn se zachovává pomocí timestampů
-- ============================================================

-- Vytvoř tabulku pricing_plans
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('free', 'creator', 'pro')),

  -- Ceny v nejmenších jednotkách (haléře, centy)
  price_czk             INTEGER NOT NULL DEFAULT 0,
  price_eur             INTEGER NOT NULL DEFAULT 0,
  price_usd             INTEGER NOT NULL DEFAULT 0,

  -- Kredity
  ai_credits            INTEGER NOT NULL DEFAULT 0,
  twitter_credits       INTEGER NOT NULL DEFAULT 0,

  -- Limity (-1 = neomezeno/∞)
  max_accounts          INTEGER NOT NULL DEFAULT 1,
  max_posts_per_month   INTEGER DEFAULT 10, -- NULL = neomezeno

  -- Stripe Price IDs pro synchronizaci
  stripe_price_id_czk   TEXT,
  stripe_price_id_eur   TEXT,
  stripe_price_id_usd   TEXT,

  -- Příznaky
  is_active             BOOLEAN NOT NULL DEFAULT true,
  is_master_template    BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: pouze jeden master template pro každý typ tarifu
CREATE UNIQUE INDEX pricing_plans_one_master_per_type_idx
  ON public.pricing_plans (type)
  WHERE is_master_template = true;

-- Zapni RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS politiky
-- ============================================================

-- Všichni mohou číst aktivní tarify (pro zobrazení ceníku)
CREATE POLICY "Anyone can view active pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (is_active = true);

-- Admin může číst všechny tarify (včetně master templates)
CREATE POLICY "Admins can view all pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může vkládat nové tarify
CREATE POLICY "Admins can insert pricing plans"
  ON public.pricing_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může upravovat tarify
CREATE POLICY "Admins can update pricing plans"
  ON public.pricing_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může mazat tarify (kromě master templates)
CREATE POLICY "Admins can delete non-master pricing plans"
  ON public.pricing_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    AND is_master_template = false
  );

-- ============================================================
-- Indexy pro výkon
-- ============================================================
CREATE INDEX IF NOT EXISTS pricing_plans_type_idx ON public.pricing_plans(type);
CREATE INDEX IF NOT EXISTS pricing_plans_is_active_idx ON public.pricing_plans(is_active);
CREATE INDEX IF NOT EXISTS pricing_plans_is_master_idx ON public.pricing_plans(is_master_template);

-- ============================================================
-- Trigger pro automatickou aktualizaci updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Komentáře k tabulce
-- ============================================================
COMMENT ON TABLE public.pricing_plans IS 'Dynamické tarify s ochranou původních hodnot (master templates)';
COMMENT ON COLUMN public.pricing_plans.is_master_template IS 'Nedotknutelný originál – nelze smazat, slouží jako fallback';
COMMENT ON COLUMN public.pricing_plans.is_active IS 'Aktuálně aktivní verze tarifu zobrazovaná uživatelům';
COMMENT ON COLUMN public.pricing_plans.max_posts_per_month IS 'NULL znamená neomezeno (∞)';
COMMENT ON COLUMN public.pricing_plans.max_accounts IS '-1 znamená neomezeno (∞)';

-- ============================================================
-- KROK 3: Inicializace master templates (Prompt 048)
-- ============================================================
-- Vloží původní tarify z original-plans.ts jako master templates.
-- Tyto řádky jsou chráněny (is_master_template = true) a slouží
-- jako nedotknutelný základ pro "Reset to Base" funkcionalitu.
-- ============================================================

INSERT INTO public.pricing_plans (
  name,
  type,
  price_czk,
  price_eur,
  price_usd,
  ai_credits,
  twitter_credits,
  max_accounts,
  max_posts_per_month,
  is_active,
  is_master_template
) VALUES
  -- Free: 0 Kč, 1 účet, 10 postů/měs, 0 kreditů
  (
    'Free',
    'free',
    0,
    0,
    0,
    0,
    0,
    1,
    10,
    true,
    true
  ),
  -- Creator: 199 Kč/8 EUR/9 USD, 5 účtů, ∞ postů, 10 AI kreditů, 10 X kreditů
  (
    'Creator',
    'creator',
    19900,
    800,
    900,
    10,
    10,
    5,
    NULL, -- neomezeno
    true,
    true
  ),
  -- Pro: 499 Kč/20 EUR/22 USD, ∞ účtů, ∞ postů, 50 AI kreditů, 50 X kreditů
  (
    'Pro',
    'pro',
    49900,
    2000,
    2200,
    50,
    50,
    -1, -- neomezeno
    NULL, -- neomezeno
    true,
    true
  );
