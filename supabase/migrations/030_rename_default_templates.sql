-- ============================================================
-- POSTIO – Rename default templates to natural Czech & fix quote punctuation
-- ============================================================
-- The seed trigger (003_seed_templates.sql) creates 6 default templates
-- for every new user. A few of them shipped with English names ("Behind
-- the scenes", "Tip/Triky", "Weekly Recap") and the motivational quote
-- had a clumsy second sentence. This migration backfills those rows so
-- existing users see the same natural-language defaults as new signups.
--
-- Idempotent: each UPDATE only matches the *old* name / content, so
-- re-running the migration is a no-op once it has been applied.

-- 1) "Motivační příspěvek" – fix awkward second sentence in the quote.
UPDATE public.templates
   SET content = 'Úspěch není konečný, selhání není fatální – důležitá je odvaha pokračovat. 🚀' || E'\n\n' || '#motivace #úspěch #odvaha'
 WHERE name = 'Motivační příspěvek'
   AND content LIKE 'Úspěch není konečný, selhání není fatální.%Je to odvaha%';

-- 2) "Behind the scenes" → "Ze zákulisí".
UPDATE public.templates
   SET name = 'Ze zákulisí'
 WHERE name = 'Behind the scenes';

-- 3) "Tip/Triky" → "Tipy a triky".
UPDATE public.templates
   SET name = 'Tipy a triky'
 WHERE name = 'Tip/Triky';

-- 4) "Weekly Recap" → "Týdenní shrnutí".
UPDATE public.templates
   SET name = 'Týdenní shrnutí'
 WHERE name = 'Weekly Recap';
