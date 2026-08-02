-- ============================================================
-- POSTIO – Plan Snapshot binding (Prompt 054 KROK 2)
-- ============================================================
-- Fixuje pevnou vazbu uživatele na konkrétní instanci plánu
-- (users.current_plan_instance_id), aby změny Master šablon
-- adminem neovlivnily podmínky stávajících uživatelů.
-- ============================================================

-- 1. Backfill: navaz stávající uživatele na master instanci jejich tarifu.
--    Uživatelé s plánem free/creator/pro dostanou id příslušné master šablony.
--    Uživatelé s vlastním (custom) plánem mají current_plan_instance_id
--    nastavený z checkoutu a zůstávají beze změny.
UPDATE public.users u
SET current_plan_instance_id = (
  SELECT m.id
  FROM public.pricing_plans m
  WHERE m.type = u.plan
    AND m.is_master_template = true
  LIMIT 1
)
WHERE u.plan IN ('free', 'creator', 'pro')
  AND u.current_plan_instance_id IS NULL;

-- 2. Trigger: noví uživatelé se automaticky navážou na Free master instanci.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM public.pricing_plans
  WHERE type = 'free'
    AND is_master_template = true
  LIMIT 1;

  INSERT INTO public.users (id, full_name, avatar_url, language, current_plan_instance_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language', 'cs'),
    v_free_plan_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
