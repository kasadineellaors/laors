-- LAORS Phase 14: Seedstock — individual registry with pedigree & EPDs

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS registry_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (registry_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS sire_tag TEXT,
  ADD COLUMN IF NOT EXISTS dam_tag TEXT,
  ADD COLUMN IF NOT EXISTS pedigree TEXT,
  ADD COLUMN IF NOT EXISTS epd_birth_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_weaning_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_yearling_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_milk NUMERIC(6, 2);

ALTER TABLE public.individual_animals
  DROP CONSTRAINT IF EXISTS individual_animals_animal_type_check;

ALTER TABLE public.individual_animals
  ADD CONSTRAINT individual_animals_animal_type_check
  CHECK (animal_type IN ('bull', 'cow', 'heifer', 'steer', 'other'));

CREATE INDEX IF NOT EXISTS individual_animals_registry_idx
  ON public.individual_animals(organization_id, registry_context);

NOTIFY pgrst, 'reload schema';
