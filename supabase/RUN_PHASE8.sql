-- LAORS Phase 8: Cow-calf — run after Phase 7 (or use supabase db push)

-- ---------------------------------------------------------------------------
-- Calving records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  dam_tag TEXT,
  sire_tag TEXT,
  calf_tag TEXT,
  calf_sex TEXT NOT NULL DEFAULT 'unknown'
    CHECK (calf_sex IN ('bull_calf', 'heifer_calf', 'unknown')),
  birth_weight_lbs NUMERIC(8, 2)
    CHECK (birth_weight_lbs IS NULL OR birth_weight_lbs >= 0),
  outcome TEXT NOT NULL DEFAULT 'live'
    CHECK (outcome IN ('live', 'stillborn', 'died')),
  classification_id UUID REFERENCES public.cattle_classifications(id) ON DELETE SET NULL,
  add_to_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_added BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calving_records_org_idx
  ON public.calving_records(organization_id);
CREATE INDEX IF NOT EXISTS calving_records_date_idx
  ON public.calving_records(organization_id, calved_at DESC);

DROP TRIGGER IF EXISTS calving_records_updated_at ON public.calving_records;
CREATE TRIGGER calving_records_updated_at
  BEFORE UPDATE ON public.calving_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Individual animals (bulls)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.individual_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag_number TEXT NOT NULL,
  name TEXT,
  animal_type TEXT NOT NULL DEFAULT 'bull'
    CHECK (animal_type IN ('bull', 'cow', 'other')),
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'dead', 'archived')),
  birth_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, tag_number)
);

CREATE INDEX IF NOT EXISTS individual_animals_org_idx
  ON public.individual_animals(organization_id);
CREATE INDEX IF NOT EXISTS individual_animals_type_idx
  ON public.individual_animals(organization_id, animal_type)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS individual_animals_updated_at ON public.individual_animals;
CREATE TRIGGER individual_animals_updated_at
  BEFORE UPDATE ON public.individual_animals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read calving_records" ON public.calving_records;
CREATE POLICY "Members read calving_records"
  ON public.calving_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create calving_records" ON public.calving_records;
CREATE POLICY "Members create calving_records"
  ON public.calving_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update calving or managers update" ON public.calving_records;
CREATE POLICY "Members update calving or managers update"
  ON public.calving_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete calving_records" ON public.calving_records;
CREATE POLICY "Managers delete calving_records"
  ON public.calving_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read individual_animals" ON public.individual_animals;
CREATE POLICY "Members read individual_animals"
  ON public.individual_animals FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write individual_animals" ON public.individual_animals;
CREATE POLICY "Managers write individual_animals"
  ON public.individual_animals FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
