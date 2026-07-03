-- ============================================================
-- POSTIO – Add User Preferences Columns
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Prague',
  ADD COLUMN IF NOT EXISTS time_format TEXT NOT NULL DEFAULT '24' CHECK (time_format IN ('12', '24')),
  ADD COLUMN IF NOT EXISTS start_of_week TEXT NOT NULL DEFAULT 'monday' CHECK (start_of_week IN ('sunday', 'monday')),
  ADD COLUMN IF NOT EXISTS default_posting_time TEXT NOT NULL DEFAULT '09:00';
