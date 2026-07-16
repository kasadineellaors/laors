-- Phase 29 — Purchase weights on receive lot (pay / shrunk / received)

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS shrunk_weight_lbs NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS received_weight_lbs NUMERIC(12, 2);

NOTIFY pgrst, 'reload schema';
