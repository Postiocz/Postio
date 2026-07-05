-- 034_add_posting_schedule.sql
-- Add posting_schedule JSONB column to users table for Auto-Queue feature.
-- Structure: { enabled: boolean, "0": ["HH:MM", ...], "1": [...], ..., "6": [...] }
-- Days 0 (Sunday) – 6 (Saturday) match JS Date.getUTCDay().

ALTER TABLE users ADD COLUMN IF NOT EXISTS posting_schedule JSONB DEFAULT NULL;
