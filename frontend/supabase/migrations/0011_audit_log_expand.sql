-- ============================================================
-- Audit log: add IP + user-agent per PLANV2 §4.10.
-- Make append-only by revoking mutation from the authenticated role.
-- ============================================================

ALTER TABLE public.admin_audit_logs
  ADD COLUMN IF NOT EXISTS ip         text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Revoke UPDATE and DELETE so the log is truly append-only.
-- The Supabase service-role (used in server-side RPCs) can still INSERT.
-- RLS already prevents normal users from touching this table directly.
REVOKE UPDATE, DELETE ON public.admin_audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.admin_audit_logs FROM anon;
