-- ============================================================
-- POSTIO – Audit logs: local-time display view
-- ============================================================
-- Browsing helper for the owner: `public.audit_logs` stores `created_at`
-- as UTC (correct). This view adds `created_local` (Europe/Prague, DST-aware)
-- right next to the stored UTC value so the time-zone difference is obvious
-- when inspecting the table in Supabase.
--
-- This is a VIEW, not a generated column: generated columns require IMMUTABLE
-- expressions, while `AT TIME ZONE` is STABLE, and a fixed +2 h offset would
-- break during winter CET. Views evaluate at read time, so DST is handled.
-- The app keeps reading the plain table – nothing else changes.
-- ============================================================

CREATE OR REPLACE VIEW public.audit_logs_local AS
SELECT
  id,
  user_id,
  action,
  target_table,
  target_id,
  performed_by,
  metadata,
  created_at,
  created_at AT TIME ZONE 'Europe/Prague' AS created_local
FROM public.audit_logs;

-- Keep the operator view browsable for admins (same RLS as the base table:
-- only admins see audit logs).
ALTER VIEW public.audit_logs_local
  SET (security_invoker = true);