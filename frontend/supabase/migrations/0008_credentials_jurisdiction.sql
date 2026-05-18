-- ============================================================
-- Credentials: replace strict 2-letter state_code with free-form jurisdiction.
-- Supports county/authority entries like "Winnebago County Highway Dep".
-- ============================================================

ALTER TABLE public.customer_credentials
  ADD COLUMN IF NOT EXISTS jurisdiction          text,
  ADD COLUMN IF NOT EXISTS password_last_rotated_at timestamptz;

-- Backfill jurisdiction from existing state_code
UPDATE public.customer_credentials
SET jurisdiction = state_code
WHERE jurisdiction IS NULL;

ALTER TABLE public.customer_credentials
  ALTER COLUMN jurisdiction SET NOT NULL;

-- Replace the (customer_id, state_code, username) unique constraint
ALTER TABLE public.customer_credentials
  DROP CONSTRAINT IF EXISTS customer_credentials_customer_id_state_code_username_key;

ALTER TABLE public.customer_credentials
  ADD CONSTRAINT customer_credentials_customer_id_jurisdiction_username_key
  UNIQUE (customer_id, jurisdiction, username);

-- state_code column is kept as a legacy nullable column.
-- New inserts should set jurisdiction; state_code is no longer NOT NULL.
ALTER TABLE public.customer_credentials
  ALTER COLUMN state_code DROP NOT NULL;

-- Drop the strict format check on state_code since jurisdiction replaces it
ALTER TABLE public.customer_credentials
  DROP CONSTRAINT IF EXISTS customer_credentials_state_code_check;
