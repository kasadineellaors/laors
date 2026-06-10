-- LAORS Phase 11: Cow-calf feed context — run after Phase 10

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS feeding_context TEXT NOT NULL DEFAULT 'general'
  CHECK (feeding_context IN ('general', 'cow_calf'));

CREATE INDEX IF NOT EXISTS feeding_records_context_idx
  ON public.feeding_records(organization_id, feeding_context);

NOTIFY pgrst, 'reload schema';
