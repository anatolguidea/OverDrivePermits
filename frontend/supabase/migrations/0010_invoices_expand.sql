-- ============================================================
-- Invoices: add PLANV2 §4.9 fields
-- ============================================================

-- Expand invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'overdue' AFTER 'sent';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'void'    AFTER 'overdue';

ALTER TABLE public.invoices
  -- Snapshot of line items at invoice creation; never recomputed from order_permits
  ADD COLUMN IF NOT EXISTS line_items_snapshot jsonb,
  -- S3 key for generated PDF
  ADD COLUMN IF NOT EXISTS pdf_s3_key          text,
  -- Soft delete
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz;

-- Existing invoice_line_items rows are the live data; snapshot is populated on new invoices.
