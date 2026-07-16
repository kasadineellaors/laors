-- LAORS Phase 25: Sale out-weight for closeout performance

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS avg_weight_lbs NUMERIC(12, 2);

NOTIFY pgrst, 'reload schema';
