-- ============================================================
-- POSTIO – Referral system (Prompt 034)
-- ============================================================
-- Adds referral columns to public.users and updates the
-- new-user trigger so every account gets a unique referral code.
-- Existing rows are backfilled with a generated code.

-- 1. New columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Trigger: generate a unique referral_code for every new user.
--    A retry loop handles the (rare) UNIQUE collision on the 6-char code.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    BEGIN
      INSERT INTO public.users (id, full_name, avatar_url, language, referral_code)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'language', 'cs'),
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

-- 3. Backfill referral_code for accounts created before this migration.
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
