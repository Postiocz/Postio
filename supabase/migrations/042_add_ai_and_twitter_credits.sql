-- ============================================================
-- POSTIO – AI Credits + Twitter Auto Credits (Prompt 043)
-- ============================================================
-- Přidává sloupce pro kreditový systém drahých funkcí:
--   ai_credits          – kolik AI obrázků uživateli zbývá
--   twitter_auto_credits – kolik automatických X postů zbývá
--
-- Výchozí hodnoty podle plánu:
--   Free:     0 / 0
--   Creator: 10 / 10
--   Pro:     50 / 50
-- ============================================================

-- Přidej sloupce
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS twitter_auto_credits INTEGER NOT NULL DEFAULT 0;

-- Nastav správné hodnoty pro existující placené uživatele
UPDATE public.users SET ai_credits = 10, twitter_auto_credits = 10 WHERE plan = 'creator';
UPDATE public.users SET ai_credits = 50, twitter_auto_credits = 50 WHERE plan = 'pro';
