-- Phase 34 — Cattle list signals, withdrawal tracking, current weight
-- Run in Supabase SQL Editor if not using db push.

ALTER TABLE public.medicine_items
  ADD COLUMN IF NOT EXISTS withdrawal_days INTEGER CHECK (withdrawal_days IS NULL OR withdrawal_days >= 0);

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS withdrawal_until DATE;

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS current_avg_weight_lbs NUMERIC(10, 2)
    CHECK (current_avg_weight_lbs IS NULL OR current_avg_weight_lbs > 0);

UPDATE public.cattle_groups
SET current_avg_weight_lbs = avg_weight_lbs
WHERE current_avg_weight_lbs IS NULL
  AND avg_weight_lbs IS NOT NULL
  AND avg_weight_lbs > 0;

UPDATE public.treatment_records tr
SET withdrawal_until = (tr.treatment_date + (mi.withdrawal_days || ' days')::interval)::date
FROM public.medicine_items mi
WHERE tr.medicine_item_id = mi.id
  AND tr.withdrawal_until IS NULL
  AND mi.withdrawal_days IS NOT NULL
  AND mi.withdrawal_days > 0;

NOTIFY pgrst, 'reload schema';
