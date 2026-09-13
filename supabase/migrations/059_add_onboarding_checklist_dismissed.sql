-- ============================================================
-- POSTIO – persistovaný dismiss onboarding checklistu (Prompt 071)
-- ============================================================
-- Natrvalé schování setup-guide modálu ("Dokončete nastavení"),
-- když užívatel zavře ho po dosažení 100 % (4/4). Zápisuje se POUZE
-- při kliku na křížek (handleDismiss) při kompletním checklisti –
-- automatický schování bez kliku nedělá se.
--
-- Sloupec:
--   onboarding_checklist_dismissed BOOLEAN – DEFAULT false ⇒ stávající
--     užívatelé mají chování bez změny, dokud sami nezavřou modál po 4/4.
-- ============================================================

-- 1. Přidat sloupec (výchozí false pro všechny stávající uživatele)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed BOOLEAN NOT NULL DEFAULT false;

-- 2. Komentář ke sloupcí
COMMENT ON COLUMN public.users.onboarding_checklist_dismissed IS
  'Uživatel natrvalo skryl "Dokončete nastavení" checklist po dosažení 100 % (4/4).';