-- ============================================================
-- OSW Permits Admin Schema
-- ============================================================

-- Enums
CREATE TYPE public.vehicle_type   AS ENUM ('truck', 'trailer');
CREATE TYPE public.order_status   AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE public.permit_status  AS ENUM ('pending', 'submitted', 'issued');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid');

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Sequences for human-readable IDs
-- ============================================================
CREATE SEQUENCE public.order_seq   START 1;
CREATE SEQUENCE public.invoice_seq START 1;

-- ============================================================
-- admins
-- ============================================================
CREATE TABLE public.admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select" ON public.admins
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- us_states (reference)
-- ============================================================
CREATE TABLE public.us_states (
  code char(2) PRIMARY KEY,
  name text   NOT NULL
);

ALTER TABLE public.us_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "us_states_select_admin" ON public.us_states
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- customers
-- ============================================================
CREATE TABLE public.customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  usdot         text UNIQUE,
  mc_number     text,
  fein          text,
  ifta_number   text,
  email         text,
  phone         text,
  address_line1 text,
  address_line2 text,
  city          text,
  state_code    char(2),
  zip           text,
  created_by    uuid REFERENCES auth.users,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name   ON public.customers (name);
CREATE INDEX idx_customers_usdot  ON public.customers (usdot) WHERE usdot IS NOT NULL;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_admin" ON public.customers
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- vehicles
-- ============================================================
CREATE TABLE public.vehicles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  unit_number  text NOT NULL,
  vin          text UNIQUE,
  plate_number text,
  make         text,
  year         int  CHECK (year BETWEEN 1900 AND 2100),
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'truck',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, unit_number)
);

CREATE INDEX idx_vehicles_customer ON public.vehicles (customer_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_admin" ON public.vehicles
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- customer_credentials (state portal logins)
-- ============================================================
CREATE TABLE public.customer_credentials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  state_code          char(2) NOT NULL,
  username            text NOT NULL,
  password_ciphertext text NOT NULL,
  password_iv         text NOT NULL,
  password_tag        text NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, state_code, username)
);

CREATE INDEX idx_creds_customer ON public.customer_credentials (customer_id);

ALTER TABLE public.customer_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credentials_admin" ON public.customer_credentials
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER credentials_updated_at
  BEFORE UPDATE ON public.customer_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE public.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text UNIQUE NOT NULL,
  customer_id   uuid NOT NULL REFERENCES public.customers,
  vehicle_id    uuid REFERENCES public.vehicles,
  status        public.order_status NOT NULL DEFAULT 'draft',
  origin        text,
  destination   text,
  route_states  text[] NOT NULL DEFAULT '{}',
  trip_date     date,
  notes         text,
  created_by    uuid REFERENCES auth.users,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders (customer_id);
CREATE INDEX idx_orders_status   ON public.orders (status);
CREATE INDEX idx_orders_trip     ON public.orders (trip_date DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_admin" ON public.orders
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate order_number: ORD-YYYY-NNNNN
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_number := 'ORD-' || to_char(now(), 'YYYY') || '-' ||
                       lpad(nextval('public.order_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_set_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION public.generate_order_number();

-- ============================================================
-- permits
-- ============================================================
CREATE TABLE public.permits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  state_code    char(2) NOT NULL,
  status        public.permit_status NOT NULL DEFAULT 'pending',
  cost          numeric(10, 2),
  permit_number text,
  document_url  text,
  issue_date    date,
  submitted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, state_code)
);

CREATE INDEX idx_permits_order  ON public.permits (order_id);
CREATE INDEX idx_permits_status ON public.permits (status);

ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permits_admin" ON public.permits
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER permits_updated_at
  BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE public.invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id    uuid NOT NULL REFERENCES public.customers,
  order_id       uuid REFERENCES public.orders,
  subtotal       numeric(12, 2) NOT NULL DEFAULT 0,
  tax            numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount   numeric(12, 2) GENERATED ALWAYS AS (subtotal + tax) STORED,
  status         public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date     date NOT NULL DEFAULT current_date,
  due_date       date,
  paid_at        timestamptz,
  notes          text,
  created_by     uuid REFERENCES auth.users,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_customer ON public.invoices (customer_id);
CREATE INDEX idx_invoices_status   ON public.invoices (status);
CREATE INDEX idx_invoices_date     ON public.invoices (issue_date DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_admin" ON public.invoices
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate invoice_number: INV-YYYY-NNNNN
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
                         lpad(nextval('public.invoice_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_set_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

-- ============================================================
-- invoice_line_items
-- ============================================================
CREATE TABLE public.invoice_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  numeric(10, 2) NOT NULL DEFAULT 0,
  subtotal    numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  position    int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_invoice ON public.invoice_line_items (invoice_id, position);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "line_items_admin" ON public.invoice_line_items
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Recompute invoice subtotal when line items change
CREATE OR REPLACE FUNCTION public.sync_invoice_subtotal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal   numeric(12, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM public.invoice_line_items
   WHERE invoice_id = v_invoice_id;

  UPDATE public.invoices SET subtotal = v_subtotal WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER line_items_sync_subtotal
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_subtotal();

-- ============================================================
-- RPC: create_order_with_permits (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_order_with_permits(
  p_order   jsonb,
  p_permits jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id     uuid;
  v_order_number text;
  v_permit       jsonb;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert order (order_number generated by trigger)
  INSERT INTO public.orders (
    customer_id,
    vehicle_id,
    status,
    origin,
    destination,
    route_states,
    trip_date,
    notes,
    created_by
  )
  VALUES (
    (p_order->>'customer_id')::uuid,
    NULLIF(p_order->>'vehicle_id', '')::uuid,
    COALESCE((p_order->>'status')::public.order_status, 'draft'),
    p_order->>'origin',
    p_order->>'destination',
    ARRAY(SELECT jsonb_array_elements_text(p_order->'route_states')),
    NULLIF(p_order->>'trip_date', '')::date,
    p_order->>'notes',
    auth.uid()
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Insert permits
  FOR v_permit IN SELECT * FROM jsonb_array_elements(p_permits)
  LOOP
    INSERT INTO public.permits (order_id, state_code, cost)
    VALUES (
      v_order_id,
      v_permit->>'state_code',
      NULLIF(v_permit->>'cost', '')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
END;
$$;
