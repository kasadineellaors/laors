-- LAORS Phase 9: Breeding records (cow-calf)

CREATE TABLE IF NOT EXISTS public.breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  dam_tag TEXT,
  bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  sire_tag TEXT,
  breeding_method TEXT NOT NULL DEFAULT 'natural'
    CHECK (breeding_method IN ('natural', 'ai', 'embryo', 'other')),
  expected_calving_date DATE,
  pregnancy_status TEXT NOT NULL DEFAULT 'bred'
    CHECK (pregnancy_status IN ('bred', 'confirmed', 'open', 'unknown')),
  pregnancy_check_date DATE,
  calving_record_id UUID REFERENCES public.calving_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS breeding_records_org_idx
  ON public.breeding_records(organization_id);
CREATE INDEX IF NOT EXISTS breeding_records_bred_idx
  ON public.breeding_records(organization_id, bred_at DESC);

DROP TRIGGER IF EXISTS breeding_records_updated_at ON public.breeding_records;
CREATE TRIGGER breeding_records_updated_at
  BEFORE UPDATE ON public.breeding_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read breeding_records" ON public.breeding_records;
CREATE POLICY "Members read breeding_records"
  ON public.breeding_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create breeding_records" ON public.breeding_records;
CREATE POLICY "Members create breeding_records"
  ON public.breeding_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update breeding or managers update" ON public.breeding_records;
CREATE POLICY "Members update breeding or managers update"
  ON public.breeding_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete breeding_records" ON public.breeding_records;
CREATE POLICY "Managers delete breeding_records"
  ON public.breeding_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
