-- LAORS Phase 35: Cow-Calf enterprise foundation (additive only — Stocker tables unchanged)

-- ---------------------------------------------------------------------------
-- Cow-Calf herds (distinct from stocker lots / cattle_groups)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cow_calf_herds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  current_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'closed')),
  description TEXT,
  breeding_season TEXT,
  calving_season TEXT,
  recordkeeping_mode TEXT NOT NULL DEFAULT 'individual'
    CHECK (recordkeeping_mode IN ('individual', 'group', 'mixed')),
  group_cows_count INTEGER NOT NULL DEFAULT 0 CHECK (group_cows_count >= 0),
  group_calves_at_side_count INTEGER NOT NULL DEFAULT 0 CHECK (group_calves_at_side_count >= 0),
  group_bulls_count INTEGER NOT NULL DEFAULT 0 CHECK (group_bulls_count >= 0),
  group_replacements_count INTEGER NOT NULL DEFAULT 0 CHECK (group_replacements_count >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS cow_calf_herds_org_idx
  ON public.cow_calf_herds(organization_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS cow_calf_herds_location_idx
  ON public.cow_calf_herds(organization_id, current_location_id)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS cow_calf_herds_updated_at ON public.cow_calf_herds;
CREATE TRIGGER cow_calf_herds_updated_at
  BEFORE UPDATE ON public.cow_calf_herds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dam–calf nursing relationships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_calf_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dam_id UUID NOT NULL REFERENCES public.individual_animals(id) ON DELETE CASCADE,
  calf_id UUID NOT NULL REFERENCES public.individual_animals(id) ON DELETE CASCADE,
  birth_date DATE,
  relationship_status TEXT NOT NULL DEFAULT 'nursing'
    CHECK (relationship_status IN ('nursing', 'weaned', 'ended', 'fostered')),
  fostered BOOLEAN NOT NULL DEFAULT FALSE,
  nursing_status TEXT NOT NULL DEFAULT 'at_side'
    CHECK (nursing_status IN ('at_side', 'weaned', 'ended')),
  weaning_date DATE,
  calving_record_id UUID REFERENCES public.calving_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (dam_id <> calf_id)
);

CREATE INDEX IF NOT EXISTS dam_calf_rel_org_idx
  ON public.dam_calf_relationships(organization_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS dam_calf_rel_dam_idx
  ON public.dam_calf_relationships(organization_id, dam_id)
  WHERE is_active = TRUE AND nursing_status = 'at_side';

CREATE INDEX IF NOT EXISTS dam_calf_rel_calf_idx
  ON public.dam_calf_relationships(organization_id, calf_id)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS dam_calf_relationships_updated_at ON public.dam_calf_relationships;
CREATE TRIGGER dam_calf_relationships_updated_at
  BEFORE UPDATE ON public.dam_calf_relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cow-Calf activity log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cow_calf_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  source_table TEXT,
  source_id UUID,
  summary TEXT NOT NULL,
  details JSONB,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cow_calf_activity_org_idx
  ON public.cow_calf_activity_log(organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Extend individual_animals for Cow-Calf enterprise (nullable — Stocker unaffected)
-- ---------------------------------------------------------------------------
ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS cow_calf_herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reproductive_status TEXT,
  ADD COLUMN IF NOT EXISTS calf_lifecycle_status TEXT,
  ADD COLUMN IF NOT EXISTS eid TEXT,
  ADD COLUMN IF NOT EXISTS ear_tag TEXT,
  ADD COLUMN IF NOT EXISTS ranch_id_number TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS individual_animals_cow_calf_herd_idx
  ON public.individual_animals(organization_id, cow_calf_herd_id)
  WHERE is_active = TRUE AND registry_context = 'cow_calf';

-- Link calving records to herds (optional; cattle_group_id remains for legacy inventory bump)
ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS cow_calf_herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.cow_calf_herds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dam_calf_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cow_calf_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cow_calf_herds" ON public.cow_calf_herds;
CREATE POLICY "Members read cow_calf_herds"
  ON public.cow_calf_herds FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cow_calf_herds" ON public.cow_calf_herds;
CREATE POLICY "Managers write cow_calf_herds"
  ON public.cow_calf_herds FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read dam_calf_relationships" ON public.dam_calf_relationships;
CREATE POLICY "Members read dam_calf_relationships"
  ON public.dam_calf_relationships FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write dam_calf_relationships" ON public.dam_calf_relationships;
CREATE POLICY "Managers write dam_calf_relationships"
  ON public.dam_calf_relationships FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read cow_calf_activity_log" ON public.cow_calf_activity_log;
CREATE POLICY "Members read cow_calf_activity_log"
  ON public.cow_calf_activity_log FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create cow_calf_activity_log" ON public.cow_calf_activity_log;
CREATE POLICY "Members create cow_calf_activity_log"
  ON public.cow_calf_activity_log FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

NOTIFY pgrst, 'reload schema';
