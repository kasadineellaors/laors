-- Run in Supabase SQL Editor: billing rate modes + invoice billing snapshot

-- Explicit pasture vs yardage on location types (location tier) and per-location override
ALTER TABLE public.location_types
  ADD COLUMN IF NOT EXISTS billing_rate_mode TEXT
  CHECK (billing_rate_mode IS NULL OR billing_rate_mode IN ('pasture', 'yardage'));

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS billing_rate_mode TEXT NOT NULL DEFAULT 'inherit'
  CHECK (billing_rate_mode IN ('inherit', 'pasture', 'yardage'));

-- Default location-tier types to yardage; backfill obvious pasture names for existing ranches
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
