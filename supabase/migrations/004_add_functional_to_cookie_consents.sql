-- Add missing 'functional' column to cookie_consents table
ALTER TABLE public.cookie_consents
ADD COLUMN IF NOT EXISTS functional BOOLEAN NOT NULL DEFAULT FALSE;
