-- LAORS Phase 21: Feed cost snapshots + ration effective dates

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS total_feed_cost NUMERIC(14, 2);

ALTER TABLE public.feed_rations
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE;

NOTIFY pgrst, 'reload schema';
