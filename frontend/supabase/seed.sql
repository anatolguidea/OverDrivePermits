-- ============================================================
-- Development seed — 2 customers, equipment, 5 orders
-- ============================================================
-- NOTE: The admin user (vasilcov@osw.com) must be created via
-- Supabase Auth (dashboard or `supabase auth create-user`) and
-- then inserted into public.admins manually:
--
--   INSERT INTO public.admins (user_id, role)
--   VALUES ('<uuid-from-auth>', 'super_admin');
--
--   INSERT INTO public.operator_profiles (user_id, full_name)
--   VALUES ('<uuid-from-auth>', 'Vasilcov OSW');
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- Customers
-- --------------------------------------------------------
INSERT INTO public.customers (id, name, dba_name, usdot, mc_number, email, phone, city, state_code, zip, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-0001-0000-0000-000000000001',
    'NOMAD EXPRESS GROUP LLC',
    'NOMAD EXPRESS',
    '3456789',
    '1234567',
    'dispatch@nomadexpress.com',
    '(555) 100-0001',
    'Chicago',
    'IL',
    '60601',
    now(), now()
  ),
  (
    'aaaaaaaa-0001-0000-0000-000000000002',
    'IRON ROAD TRANSPORT INC',
    NULL,
    '7654321',
    '9876543',
    'ops@ironroadtransport.com',
    '(555) 200-0002',
    'Dallas',
    'TX',
    '75201',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Trucks
-- --------------------------------------------------------
INSERT INTO public.trucks (id, customer_id, unit_number, year, make, model, vin, plate, plate_state, active)
VALUES
  -- Nomad Express trucks
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', '406', 2020, 'FRHT', 'Cascadia', '1FUJGBDV0LLKH1234', 'NE9001', 'IL', true),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', '407', 2019, 'VOLV', 'VNL', '4V4NC9EH0KN111111', 'NE9002', 'IL', true),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000001', '408', 2021, 'INTL', 'LT625', '3HSDJAPR4MN222222', 'NE9003', 'IL', true),
  -- Iron Road trucks
  ('bbbbbbbb-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000002', '101', 2022, 'FRHT', 'Cascadia', '1FUJGBDV0NNKH5678', 'IR1001', 'TX', true),
  ('bbbbbbbb-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000002', '102', 2020, 'KENWT', 'T680', '1XKAD49X0LJ333333', 'IR1002', 'TX', true),
  ('bbbbbbbb-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000002', '103', 2021, 'PETBLT', '579', '1XPBDP9X9MD444444', 'IR1003', 'TX', true)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Trailers
-- --------------------------------------------------------
INSERT INTO public.trailers (id, customer_id, unit_number, year, make, plate, plate_state, trailer_type, active)
VALUES
  -- Nomad Express trailers
  ('cccccccc-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'T-201', 2019, 'REITNOUER', 'NET201', 'IL', 'flatbed', true),
  ('cccccccc-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'T-202', 2021, 'MAC TRAILER', 'NET202', 'IL', 'stepdeck', true),
  ('cccccccc-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000001', 'T-203', 2020, 'FONTAINE', 'NET203', 'IL', 'flatbed', true),
  -- Iron Road trailers
  ('cccccccc-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000002', 'T-301', 2022, 'REITNOUER', 'IRT301', 'TX', 'flatbed', true),
  ('cccccccc-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000002', 'T-302', 2020, 'WABASH', 'IRT302', 'TX', 'stepdeck', true),
  ('cccccccc-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000002', 'T-303', 2021, 'FONTAINE', 'IRT303', 'TX', 'lowboy', true)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Orders (5 sample orders)
-- --------------------------------------------------------
INSERT INTO public.orders (id, customer_id, truck_id, trailer_id, driver_name, status, origin, destination, route_states, trip_date, dimensions, service_fee_cents, notes, created_at, updated_at)
VALUES
  (
    'dddddddd-0001-0000-0000-000000000001',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'cccccccc-0001-0000-0000-000000000001',
    'John Doe',
    'active',
    'Chicago, IL',
    'Memphis, TN',
    ARRAY['IL', 'MO', 'TN'],
    CURRENT_DATE + 3,
    '{"length":53,"width":8.5,"height":13.5,"weight":80000,"overhang_front":0,"overhang_rear":4,"overhang_left":0,"overhang_right":0}'::jsonb,
    15000,
    NULL,
    now(), now()
  ),
  (
    'dddddddd-0001-0000-0000-000000000002',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000002',
    'cccccccc-0001-0000-0000-000000000002',
    'Maria Garcia',
    'active',
    'Chicago, IL',
    'Atlanta, GA',
    ARRAY['IL', 'IN', 'KY', 'TN', 'GA'],
    CURRENT_DATE + 5,
    '{"length":48,"width":14,"height":13,"weight":120000,"overhang_front":2,"overhang_rear":6,"overhang_left":0,"overhang_right":0}'::jsonb,
    25000,
    'Overwidth — double-check KY permit',
    now(), now()
  ),
  (
    'dddddddd-0001-0000-0000-000000000003',
    'aaaaaaaa-0001-0000-0000-000000000002',
    'bbbbbbbb-0001-0000-0000-000000000004',
    'cccccccc-0001-0000-0000-000000000004',
    'Robert Smith',
    'active',
    'Dallas, TX',
    'Denver, CO',
    ARRAY['TX', 'NM', 'CO'],
    CURRENT_DATE + 2,
    '{"length":53,"width":8.6,"height":13.6,"weight":95000,"overhang_front":0,"overhang_rear":2,"overhang_left":0,"overhang_right":0}'::jsonb,
    18000,
    NULL,
    now(), now()
  ),
  (
    'dddddddd-0001-0000-0000-000000000004',
    'aaaaaaaa-0001-0000-0000-000000000002',
    'bbbbbbbb-0001-0000-0000-000000000005',
    'cccccccc-0001-0000-0000-000000000005',
    'Linda Johnson',
    'completed',
    'Houston, TX',
    'Phoenix, AZ',
    ARRAY['TX', 'NM', 'AZ'],
    CURRENT_DATE - 5,
    '{"length":53,"width":9,"height":14,"weight":105000,"overhang_front":0,"overhang_rear":3,"overhang_left":0,"overhang_right":0}'::jsonb,
    20000,
    NULL,
    now() - interval '7 days', now() - interval '1 day'
  ),
  (
    'dddddddd-0001-0000-0000-000000000005',
    'aaaaaaaa-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000003',
    'cccccccc-0001-0000-0000-000000000003',
    'David Lee',
    'draft',
    'Chicago, IL',
    'Kansas City, MO',
    ARRAY['IL', 'MO'],
    CURRENT_DATE + 10,
    '{"length":48,"width":8.5,"height":13,"weight":78000,"overhang_front":0,"overhang_rear":0,"overhang_left":0,"overhang_right":0}'::jsonb,
    10000,
    NULL,
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- Permits
-- --------------------------------------------------------
INSERT INTO public.permits (order_id, jurisdiction, state_code, sort_order, status, cost)
VALUES
  -- Order 1: IL → MO → TN
  ('dddddddd-0001-0000-0000-000000000001', 'IL', 'IL', 0, 'issued',   40.00),
  ('dddddddd-0001-0000-0000-000000000001', 'MO', 'MO', 1, 'submitted', 55.00),
  ('dddddddd-0001-0000-0000-000000000001', 'TN', 'TN', 2, 'pending',   65.00),
  -- Order 2: IL → IN → KY → TN → GA
  ('dddddddd-0001-0000-0000-000000000002', 'IL', 'IL', 0, 'issued',   40.00),
  ('dddddddd-0001-0000-0000-000000000002', 'IN', 'IN', 1, 'issued',   35.00),
  ('dddddddd-0001-0000-0000-000000000002', 'KY', 'KY', 2, 'in_progress', 85.00),
  ('dddddddd-0001-0000-0000-000000000002', 'TN', 'TN', 3, 'pending',  65.00),
  ('dddddddd-0001-0000-0000-000000000002', 'GA', 'GA', 4, 'pending',  45.00),
  -- Order 3: TX → NM → CO
  ('dddddddd-0001-0000-0000-000000000003', 'TX', 'TX', 0, 'submitted', 80.00),
  ('dddddddd-0001-0000-0000-000000000003', 'NM', 'NM', 1, 'pending',   60.00),
  ('dddddddd-0001-0000-0000-000000000003', 'CO', 'CO', 2, 'pending',   70.00),
  -- Order 4 (completed): TX → NM → AZ
  ('dddddddd-0001-0000-0000-000000000004', 'TX', 'TX', 0, 'issued', 80.00),
  ('dddddddd-0001-0000-0000-000000000004', 'NM', 'NM', 1, 'issued', 60.00),
  ('dddddddd-0001-0000-0000-000000000004', 'AZ', 'AZ', 2, 'issued', 75.00),
  -- Order 5 (draft): IL → MO
  ('dddddddd-0001-0000-0000-000000000005', 'IL', 'IL', 0, 'pending', 40.00),
  ('dddddddd-0001-0000-0000-000000000005', 'MO', 'MO', 1, 'pending', 55.00)
ON CONFLICT (order_id, jurisdiction) DO NOTHING;

COMMIT;
