-- Billing rate modes + invoice billing snapshot

ALTER TABLE public.location_types
  ADD COLUMN IF NOT EXISTS billing_rate_mode TEXT
  CHECK (billing_rate_mode IS NULL OR billing_rate_mode IN ('pasture', 'yardage'));

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS billing_rate_mode TEXT NOT NULL DEFAULT 'inherit'
  CHECK (billing_rate_mode IN ('inherit', 'pasture', 'yardage'));

UPDATE public.location_types
SET billing_rate_mode = 'yardage'
WHERE tier = 'location' AND billing_rate_mode IS NULL;

UPDATE public.location_types
SET billing_rate_mode = 'pasture'
WHERE tier = 'location'
  AND billing_rate_mode = 'yardage'
  AND name ~* '(pasture|grass|range|graze|meadow|prairie)';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_snapshot JSONB;
