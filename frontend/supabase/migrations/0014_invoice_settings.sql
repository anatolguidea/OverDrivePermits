-- ============================================================
-- Invoice settings + configurable invoice number generation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id                   boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  company_name         text NOT NULL DEFAULT 'OVERDRIVE PERMITS',
  company_address      text,
  company_logo_url     text,
  sender_name          text,
  sender_email         text,
  invoice_number_prefix text NOT NULL DEFAULT 'INV-',
  next_invoice_number  bigint NOT NULL DEFAULT 1 CHECK (next_invoice_number > 0),
  updated_by           uuid REFERENCES auth.users,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_settings_admin" ON public.invoice_settings
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

INSERT INTO public.invoice_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_next   bigint;
BEGIN
  SELECT invoice_number_prefix, next_invoice_number
    INTO v_prefix, v_next
    FROM public.invoice_settings
   WHERE id = true
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.invoice_settings (id) VALUES (true)
    ON CONFLICT (id) DO NOTHING;

    SELECT invoice_number_prefix, next_invoice_number
      INTO v_prefix, v_next
      FROM public.invoice_settings
     WHERE id = true
     FOR UPDATE;
  END IF;

  NEW.invoice_number := COALESCE(NULLIF(v_prefix, ''), 'INV-') || lpad(v_next::text, 5, '0');

  UPDATE public.invoice_settings
     SET next_invoice_number = v_next + 1,
         updated_at = now()
   WHERE id = true;

  RETURN NEW;
END;
$$;
