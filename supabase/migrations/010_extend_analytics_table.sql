-- ============================================================
-- 10. Extend analytics table with detailed metrics
-- ============================================================

ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS likes INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INT NOT NULL DEFAULT 0;
