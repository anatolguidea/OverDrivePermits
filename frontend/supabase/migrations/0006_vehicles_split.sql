-- ============================================================
-- Split polymorphic vehicles table into trucks + trailers.
-- Existing vehicle UUIDs are preserved so FK backfills work.
-- ============================================================

-- --------------------------------------------------------
-- trucks
-- --------------------------------------------------------
CREATE TABLE public.trucks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  unit_number      text NOT NULL,
  year             int  CHECK (year BETWEEN 1900 AND 2100),
  make             text,
  model            text,
  plate            text,
  plate_state      char(2),
  plate_expiry     date,
  vin              text,
  registered_weight int,
  active           bool NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  UNIQUE (customer_id, unit_number)
);

CREATE INDEX idx_trucks_customer ON public.trucks (customer_id);
CREATE INDEX idx_trucks_active   ON public.trucks (customer_id, active) WHERE deleted_at IS NULL;

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trucks_admin" ON public.trucks
  USING  (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------
-- trailers
-- --------------------------------------------------------
CREATE TABLE public.trailers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  unit_number  text NOT NULL,
  year         int  CHECK (year BETWEEN 1900 AND 2100),
  make         text,
  plate        text,
  plate_state  char(2),
  plate_expiry date,
  vin          text,
  trailer_type text,   -- flatbed, stepdeck, lowboy, etc.
  active       bool NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  UNIQUE (customer_id, unit_number)
);

CREATE INDEX idx_trailers_customer ON public.trailers (customer_id);
CREATE INDEX idx_trailers_active   ON public.trailers (customer_id, active) WHERE deleted_at IS NULL;

ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trailers_admin" ON public.trailers
  USING  (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE TRIGGER trailers_updated_at
  BEFORE UPDATE ON public.trailers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------
-- Migrate existing vehicle data (same IDs preserved)
-- --------------------------------------------------------
INSERT INTO public.trucks (
  id, customer_id, unit_number, vin, plate, make, year,
  active, created_at, updated_at
)
SELECT
  id, customer_id, unit_number, vin, plate_number, make, year,
  true, created_at, updated_at
FROM public.vehicles
WHERE vehicle_type = 'truck'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trailers (
  id, customer_id, unit_number, vin, plate, make, year,
  active, created_at, updated_at
)
SELECT
  id, customer_id, unit_number, vin, plate_number, make, year,
  true, created_at, updated_at
FROM public.vehicles
WHERE vehicle_type = 'trailer'
ON CONFLICT (id) DO NOTHING;
