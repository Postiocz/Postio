-- ============================================================
-- POSTIO – Admin User Control (Prompt 060)
-- 1. `users.is_active`   – enables account deactivation from admin panel
-- 2. `audit_logs.performed_by` – records WHICH admin performed an action
-- ============================================================

-- ============================================================
-- 1. Deactivation flag on users (default true; existing = active)
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 2. Operator reference on audit_logs
--    FK -> users(id), nullable so system events keep working.
-- ============================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Index for filtering audit history by the operating admin
CREATE INDEX IF NOT EXISTS audit_logs_performed_by_idx ON public.audit_logs(performed_by);
