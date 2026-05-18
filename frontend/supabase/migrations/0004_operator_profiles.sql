-- ============================================================
-- Operator profiles (extends Supabase auth.users via admins)
-- Tracks login state, lockout, 2FA, and display metadata.
-- ============================================================

CREATE TABLE public.operator_profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name            text,
  last_login_at        timestamptz,
  failed_login_count   int NOT NULL DEFAULT 0,
  locked_until         timestamptz,
  totp_secret_enc      text,   -- AES-256-GCM encrypted TOTP secret; null = 2FA not enrolled
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_profiles ENABLE ROW LEVEL SECURITY;

-- Operators can read/update their own profile
CREATE POLICY "op_profiles_self_rw" ON public.operator_profiles
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- super_admin / owner can read all profiles
CREATE POLICY "op_profiles_admin_read" ON public.operator_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner')
    )
  );

CREATE TRIGGER operator_profiles_updated_at
  BEFORE UPDATE ON public.operator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Expand admin roles to include the PLANV2 §4.1 role set.
-- Keep super_admin for backwards compat (treated as owner).
-- ============================================================
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;

ALTER TABLE public.admins
  ADD CONSTRAINT admins_role_check
  CHECK (role IN ('admin', 'super_admin', 'owner', 'dispatcher', 'viewer'));
