-- ============================================================
-- Permits: add PLANV2 §4.8 status values, jurisdiction, and route ordering
-- ============================================================

-- Expand permit_status enum
ALTER TYPE public.permit_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'submitted';
ALTER TYPE public.permit_status ADD VALUE IF NOT EXISTS 'rejected'    AFTER  'issued';
ALTER TYPE public.permit_status ADD VALUE IF NOT EXISTS 'not_needed'  AFTER  'rejected';

-- Add jurisdiction (free-form, replaces 2-letter state_code)
ALTER TABLE public.permits
  ADD COLUMN IF NOT EXISTS jurisdiction            text,
  ADD COLUMN IF NOT EXISTS sort_order              int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from              date,
  ADD COLUMN IF NOT EXISTS valid_until             date,
  ADD COLUMN IF NOT EXISTS submitted_by_operator_id uuid REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS document_s3_key         text;

-- Backfill jurisdiction from state_code
UPDATE public.permits
SET jurisdiction = state_code
WHERE jurisdiction IS NULL;

ALTER TABLE public.permits
  ALTER COLUMN jurisdiction SET NOT NULL;

-- Drop the (order_id, state_code) unique constraint, replace with jurisdiction
ALTER TABLE public.permits
  DROP CONSTRAINT IF EXISTS permits_order_id_state_code_key;

ALTER TABLE public.permits
  ADD CONSTRAINT permits_order_id_jurisdiction_key
  UNIQUE (order_id, jurisdiction);

-- state_code is kept as a legacy nullable column
ALTER TABLE public.permits
  ALTER COLUMN state_code DROP NOT NULL;

ALTER TABLE public.permits
  DROP CONSTRAINT IF EXISTS permits_state_code_check;
