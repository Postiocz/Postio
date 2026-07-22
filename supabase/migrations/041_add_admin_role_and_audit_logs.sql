-- ============================================================
-- POSTIO – Admin Role + Audit Logs
-- ============================================================
-- Přidává sloupec `role` do public.users a novou tabulku `audit_logs`,
-- která je viditelná pouze pro administrátory.
-- ============================================================

-- ============================================================
-- 1. Přidej sloupec `role` do public.users
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Index pro rychlé filtrování adminů
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);

-- ============================================================
-- 2. Vytvoř tabulku audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_table TEXT,
  target_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zapni RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS politiky pro audit_logs
--    Pouze admin může audit_logs číst a zapisovat.
-- ============================================================

-- Admin může číst všechny audit logy
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může vkládat nové záznamy (např. z admin panelu)
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může mazat staré záznamy
CREATE POLICY "Admins can delete audit logs"
  ON public.audit_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Indexy pro výkon
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
