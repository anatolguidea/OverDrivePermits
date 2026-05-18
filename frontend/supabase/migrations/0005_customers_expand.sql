-- ============================================================
-- Customers: add PLANV2 §4.2 fields
-- ============================================================

ALTER TABLE public.customers
  -- Company identity
  ADD COLUMN IF NOT EXISTS dba_name text,
  -- Primary contact
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  -- Billing
  ADD COLUMN IF NOT EXISTS billing_email text,
  -- Operator notes
  ADD COLUMN IF NOT EXISTS notes text,
  -- Soft delete
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  -- FEIN encrypted at rest (AES-256-GCM).
  -- Existing plaintext fein column is kept during transition;
  -- application code must encrypt new values and backfill old ones.
  ADD COLUMN IF NOT EXISTS fein_ciphertext text,
  ADD COLUMN IF NOT EXISTS fein_iv text,
  ADD COLUMN IF NOT EXISTS fein_tag text;

-- Soft-delete index so list queries can filter efficiently
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON public.customers (deleted_at)
  WHERE deleted_at IS NOT NULL;
