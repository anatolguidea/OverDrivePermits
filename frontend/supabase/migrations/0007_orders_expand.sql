-- ============================================================
-- Orders: add PLANV2 §4.7 fields + update create_order_with_permits RPC
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS truck_id              uuid REFERENCES public.trucks   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trailer_id            uuid REFERENCES public.trailers ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_name           text,
  ADD COLUMN IF NOT EXISTS dimensions            jsonb,
  ADD COLUMN IF NOT EXISTS assigned_operator_id  uuid REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS service_fee_cents     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at            timestamptz;

-- Backfill truck_id / trailer_id from legacy vehicle_id
UPDATE public.orders o
SET truck_id = v.id
FROM public.vehicles v
WHERE v.id = o.vehicle_id
  AND v.vehicle_type = 'truck'
  AND o.truck_id IS NULL;

UPDATE public.orders o
SET trailer_id = v.id
FROM public.vehicles v
WHERE v.id = o.vehicle_id
  AND v.vehicle_type = 'trailer'
  AND o.trailer_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_truck_id   ON public.orders (truck_id)   WHERE truck_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_trailer_id ON public.orders (trailer_id) WHERE trailer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted    ON public.orders (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- Recreate create_order_with_permits with new fields
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
  v_sort         int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.orders (
    customer_id,
    truck_id,
    trailer_id,
    vehicle_id,       -- legacy compat: set to truck_id if provided
    driver_name,
    status,
    origin,
    destination,
    route_states,
    trip_date,
    dimensions,
    service_fee_cents,
    notes,
    created_by
  )
  VALUES (
    (p_order->>'customer_id')::uuid,
    NULLIF(p_order->>'truck_id', '')::uuid,
    NULLIF(p_order->>'trailer_id', '')::uuid,
    NULLIF(p_order->>'truck_id', '')::uuid,
    p_order->>'driver_name',
    COALESCE((p_order->>'status')::public.order_status, 'draft'),
    p_order->>'origin',
    p_order->>'destination',
    ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p_order->'route_states', '[]'::jsonb)
    )),
    NULLIF(p_order->>'trip_date', '')::date,
    CASE WHEN p_order->'dimensions' IS NOT NULL AND p_order->>'dimensions' != '' THEN p_order->'dimensions' ELSE NULL END,
    COALESCE((p_order->>'service_fee_cents')::int, 0),
    p_order->>'notes',
    auth.uid()
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_permit IN SELECT * FROM jsonb_array_elements(p_permits)
  LOOP
    INSERT INTO public.permits (
      order_id,
      jurisdiction,
      state_code,    -- legacy compat: copy jurisdiction into state_code if it is 2 chars
      cost,
      sort_order
    )
    VALUES (
      v_order_id,
      v_permit->>'jurisdiction',
      CASE
        WHEN length(v_permit->>'jurisdiction') = 2 THEN v_permit->>'jurisdiction'
        ELSE left(v_permit->>'jurisdiction', 2)
      END,
      NULLIF(v_permit->>'cost', '')::numeric,
      COALESCE((v_permit->>'sort_order')::int, v_sort)
    );
    v_sort := v_sort + 1;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
END;
$$;
