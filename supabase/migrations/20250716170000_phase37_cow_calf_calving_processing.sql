-- LAORS Phase 37: Cow-Calf calving enterprise + processing (additive; Stocker unchanged)

ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS calving_event_id UUID,
  ADD COLUMN IF NOT EXISTS twin_status TEXT
    CHECK (twin_status IS NULL OR twin_status IN ('single', 'twin', 'triplet', 'unknown')),
  ADD COLUMN IF NOT EXISTS fostered BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS calving_records_event_idx
  ON public.calving_records(organization_id, calving_event_id)
  WHERE is_active = TRUE AND calving_context = 'cow_calf';

-- Group calf processing (separate from Stocker processing_events)
CREATE TABLE IF NOT EXISTS public.cow_calf_processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cow_calf_herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'birth_processing', 'branding', 'vaccination', 'castration', 'deworming', 'other'
    )),
  processed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  product_name TEXT,
  head_count INTEGER CHECK (head_count IS NULL OR head_count >= 0),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cow_calf_processing_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  processing_event_id UUID NOT NULL
    REFERENCES public.cow_calf_processing_events(id) ON DELETE CASCADE,
  calf_id UUID NOT NULL REFERENCES public.individual_animals(id) ON DELETE CASCADE,
  weight_lbs NUMERIC,
  treatment_record_id UUID REFERENCES public.treatment_records(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (processing_event_id, calf_id)
);

CREATE INDEX IF NOT EXISTS cow_calf_processing_events_org_idx
  ON public.cow_calf_processing_events(organization_id, processed_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS cow_calf_processing_lines_calf_idx
  ON public.cow_calf_processing_lines(organization_id, calf_id)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS cow_calf_processing_events_updated_at ON public.cow_calf_processing_events;
CREATE TRIGGER cow_calf_processing_events_updated_at
  BEFORE UPDATE ON public.cow_calf_processing_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cow_calf_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cow_calf_processing_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cow_calf_processing_events" ON public.cow_calf_processing_events;
CREATE POLICY "Members read cow_calf_processing_events"
  ON public.cow_calf_processing_events FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cow_calf_processing_events" ON public.cow_calf_processing_events;
CREATE POLICY "Managers write cow_calf_processing_events"
  ON public.cow_calf_processing_events FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read cow_calf_processing_lines" ON public.cow_calf_processing_lines;
CREATE POLICY "Members read cow_calf_processing_lines"
  ON public.cow_calf_processing_lines FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cow_calf_processing_lines" ON public.cow_calf_processing_lines;
CREATE POLICY "Managers write cow_calf_processing_lines"
  ON public.cow_calf_processing_lines FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
