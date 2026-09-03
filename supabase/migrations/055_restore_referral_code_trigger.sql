-- ============================================================
-- POSTIO – Restore referral_code in handle_new_user trigger
-- ============================================================
-- Migration 050 rewrote handle_new_user() for plan snapshot binding
-- but dropped the referral_code generation added in 039. Accounts
-- created after 050 therefore have referral_code = NULL, which left
-- the referral share link empty. This restores generation and
-- backfills any missing codes. Runtime backfill also lives in
-- src/lib/referral.ts (ensureReferralCode) as a safety net.

-- 1. Rewrite the trigger: keep the Free-plan snapshot binding AND
--    generate a unique 6-char uppercase referral code.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
  new_code TEXT;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM public.pricing_plans
  WHERE type = 'free'
    AND is_master_template = true
  LIMIT 1;

  LOOP
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    BEGIN
      INSERT INTO public.users (id, full_name, avatar_url, language, current_plan_instance_id, referral_code)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'language', 'cs'),
        v_free_plan_id,
        new_code
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Collision on referral_code – retry with a fresh code.
    END;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-attach the trigger (function was recreated in place).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill referral_code for accounts with a NULL code.
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE referral_code IS NULL
  LOOP
    LOOP
      new_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
      BEGIN
        UPDATE public.users SET referral_code = new_code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Collision – retry with a fresh code.
      END;
    END LOOP;
  END LOOP;
END $$;