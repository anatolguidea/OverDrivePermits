-- ============================================================
-- OSW Permits Admin Hardening
-- ============================================================

ALTER TABLE public.admins
  ADD CONSTRAINT admins_role_check CHECK (role IN ('admin', 'super_admin'));

CREATE TABLE public.admin_audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  actor_role    text NOT NULL,
  action        text NOT NULL,
  target_table  text NOT NULL,
  target_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_actor_created
  ON public.admin_audit_logs (actor_user_id, created_at DESC);

CREATE INDEX idx_admin_audit_logs_target
  ON public.admin_audit_logs (target_table, target_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_logs_select_admin" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_audit_logs_insert_admin" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (
    actor_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

ALTER TABLE public.customers
  ADD CONSTRAINT customers_state_code_format
  CHECK (state_code IS NULL OR state_code ~ '^[A-Z]{2}$');

ALTER TABLE public.customer_credentials
  ADD CONSTRAINT customer_credentials_state_code_format
  CHECK (state_code ~ '^[A-Z]{2}$');

ALTER TABLE public.permits
  ADD CONSTRAINT permits_state_code_format
  CHECK (state_code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT permits_cost_nonnegative
  CHECK (cost IS NULL OR cost >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_tax_nonnegative
  CHECK (tax >= 0),
  ADD CONSTRAINT invoices_subtotal_nonnegative
  CHECK (subtotal >= 0),
  ADD CONSTRAINT invoices_due_date_after_issue
  CHECK (due_date IS NULL OR due_date >= issue_date),
  ADD CONSTRAINT invoices_paid_status_paid_at
  CHECK (
    (status = 'paid' AND paid_at IS NOT NULL)
    OR (status <> 'paid')
  );

ALTER FUNCTION public.create_order_with_permits(jsonb, jsonb)
  SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'permit_documents_admin_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "permit_documents_admin_select"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'permit-documents'
        AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'permit_documents_admin_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "permit_documents_admin_insert"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'permit-documents'
        AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'permit_documents_admin_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "permit_documents_admin_update"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'permit-documents'
        AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      )
      WITH CHECK (
        bucket_id = 'permit-documents'
        AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'permit_documents_admin_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "permit_documents_admin_delete"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'permit-documents'
        AND EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      )
    $policy$;
  END IF;
END $$;
