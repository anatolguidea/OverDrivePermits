-- ============================================================
-- Performance indexes for list views and FK joins
-- ============================================================

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON public.orders (customer_id, status)
  WHERE deleted_at IS NULL;

-- permits (route-order strip in dashboard)
CREATE INDEX IF NOT EXISTS idx_permits_order_sort
  ON public.permits (order_id, sort_order ASC);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status
  ON public.invoices (customer_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices (due_date)
  WHERE status IN ('sent', 'overdue');

-- credentials
CREATE INDEX IF NOT EXISTS idx_creds_customer_jurisdiction
  ON public.customer_credentials (customer_id, jurisdiction);

-- audit log — fetch activity feed for an entity
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON public.admin_audit_logs (target_table, target_id, created_at DESC);

-- trucks / trailers (already created in 0006, no-ops here)
CREATE INDEX IF NOT EXISTS idx_trucks_customer    ON public.trucks   (customer_id);
CREATE INDEX IF NOT EXISTS idx_trailers_customer  ON public.trailers (customer_id);

-- operator profiles
CREATE INDEX IF NOT EXISTS idx_op_profiles_locked
  ON public.operator_profiles (locked_until)
  WHERE locked_until IS NOT NULL;
