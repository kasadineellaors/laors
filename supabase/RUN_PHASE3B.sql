-- LAORS Phase 3B: Treatment records, time clock, rainfall
-- Run in Supabase SQL Editor after RUN_PHASE3.sql

-- ---------------------------------------------------------------------------
-- Treatment records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  treatment_type TEXT,
  head_count INTEGER CHECK (head_count IS NULL OR head_count > 0),
  treatment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS treatment_records_org_idx ON public.treatment_records(organization_id);
CREATE INDEX IF NOT EXISTS treatment_records_date_idx ON public.treatment_records(organization_id, treatment_date DESC);

DROP TRIGGER IF EXISTS treatment_records_updated_at ON public.treatment_records;
CREATE TRIGGER treatment_records_updated_at
  BEFORE UPDATE ON public.treatment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Time entries (clock in / out)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_entry_clock_order CHECK (
    clock_out_at IS NULL OR clock_out_at > clock_in_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_open_per_user
  ON public.time_entries(organization_id, user_id)
  WHERE clock_out_at IS NULL;

CREATE INDEX IF NOT EXISTS time_entries_org_user_idx
  ON public.time_entries(organization_id, user_id, clock_in_at DESC);

DROP TRIGGER IF EXISTS time_entries_updated_at ON public.time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rainfall records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rainfall_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_inches NUMERIC(6, 2) NOT NULL CHECK (amount_inches >= 0),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rainfall_records_org_idx ON public.rainfall_records(organization_id);
CREATE INDEX IF NOT EXISTS rainfall_records_date_idx ON public.rainfall_records(organization_id, recorded_date DESC);

DROP TRIGGER IF EXISTS rainfall_records_updated_at ON public.rainfall_records;
CREATE TRIGGER rainfall_records_updated_at
  BEFORE UPDATE ON public.rainfall_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: treatment_records
-- ---------------------------------------------------------------------------
ALTER TABLE public.treatment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read treatments" ON public.treatment_records;
CREATE POLICY "Members read treatments"
  ON public.treatment_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create treatments" ON public.treatment_records;
CREATE POLICY "Members create treatments"
  ON public.treatment_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update treatments" ON public.treatment_records;
CREATE POLICY "Members update own or managers update treatments"
  ON public.treatment_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete treatments" ON public.treatment_records;
CREATE POLICY "Managers delete treatments"
  ON public.treatment_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- ---------------------------------------------------------------------------
-- RLS: time_entries
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read time entries" ON public.time_entries;
CREATE POLICY "Members read time entries"
  ON public.time_entries FOR SELECT
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant'])
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members clock in" ON public.time_entries;
CREATE POLICY "Members clock in"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own time entries" ON public.time_entries;
CREATE POLICY "Members update own time entries"
  ON public.time_entries FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant'])
      OR user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: rainfall_records
-- ---------------------------------------------------------------------------
ALTER TABLE public.rainfall_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read rainfall" ON public.rainfall_records;
CREATE POLICY "Members read rainfall"
  ON public.rainfall_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create rainfall" ON public.rainfall_records;
CREATE POLICY "Members create rainfall"
  ON public.rainfall_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND recorded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update rainfall" ON public.rainfall_records;
CREATE POLICY "Members update own or managers update rainfall"
  ON public.rainfall_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR recorded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete rainfall" ON public.rainfall_records;
CREATE POLICY "Managers delete rainfall"
  ON public.rainfall_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
