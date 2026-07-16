-- LAORS Phase 36: Cow-Calf reproduction — herd links (additive; Stocker unchanged)

ALTER TABLE public.breeding_records
  ADD COLUMN IF NOT EXISTS cow_calf_herd_id UUID
    REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL;

ALTER TABLE public.exposure_records
  ADD COLUMN IF NOT EXISTS cow_calf_herd_id UUID
    REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exposed_cow_count INTEGER
    CHECK (exposed_cow_count IS NULL OR exposed_cow_count >= 0);

CREATE INDEX IF NOT EXISTS breeding_records_cow_calf_herd_idx
  ON public.breeding_records(organization_id, cow_calf_herd_id)
  WHERE is_active = TRUE AND breeding_context = 'cow_calf';

CREATE INDEX IF NOT EXISTS exposure_records_cow_calf_herd_idx
  ON public.exposure_records(organization_id, cow_calf_herd_id)
  WHERE is_active = TRUE AND breeding_context = 'cow_calf';

-- Extend pregnancy status for recheck workflow
ALTER TABLE public.breeding_records
  DROP CONSTRAINT IF EXISTS breeding_records_pregnancy_status_check;

ALTER TABLE public.breeding_records
  ADD CONSTRAINT breeding_records_pregnancy_status_check
  CHECK (pregnancy_status IN ('bred', 'confirmed', 'open', 'unknown', 'recheck'));

NOTIFY pgrst, 'reload schema';
