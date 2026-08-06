-- ============================================================
-- POSTIO – Email notification preferences (Prompt 059 KROK 2)
-- ============================================================
-- Uživatelské přepínače e-mailových upozornění na docházející
-- kredity a týdenní souhrn čerpání. Hodnoty se čtou v KROKU 3
-- (e-mailová šablona) a v KROKU 4 (server-side plánovač).
--
-- Sloupce:
--   email_low_credit_alert BOOLEAN – upozornit, když zbývá < 20 %
--   email_weekly_summary  BOOLEAN – zasílat týdenní souhrn čerpání
-- ============================================================

-- 1. Přidat sloupce (výchozí vypnuto pro všechny stávající uživatele)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_low_credit_alert BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_weekly_summary BOOLEAN NOT NULL DEFAULT false;

-- 2. Komentáře ke sloupcům
COMMENT ON COLUMN public.users.email_low_credit_alert IS
  'Uživatel chce e-mailové upozornění, když mu zbývá méně než 20 % AI nebo X kreditů.';
COMMENT ON COLUMN public.users.email_weekly_summary IS
  'Uživatel chce týdenní souhrn čerpání kreditů a počtu účtů.';
