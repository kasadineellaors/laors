-- LAORS Phase 12: Individual cow/heifer tracking — run after Phase 11

ALTER TABLE public.individual_animals
  DROP CONSTRAINT IF EXISTS individual_animals_animal_type_check;

ALTER TABLE public.individual_animals
  ADD CONSTRAINT individual_animals_animal_type_check
  CHECK (animal_type IN ('bull', 'cow', 'heifer', 'other'));

NOTIFY pgrst, 'reload schema';
