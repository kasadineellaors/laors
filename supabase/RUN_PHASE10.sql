-- LAORS Phase 10: Treatment reason, feed rations, feeding — run after Phase 9

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS feed_markup_percent NUMERIC(5, 2);

CREATE TABLE IF NOT EXISTS public.feed_rations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ton',
  price_per_unit NUMERIC(12, 4),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS feed_rations_org_idx ON public.feed_rations(organization_id);

DROP TRIGGER IF EXISTS feed_rations_updated_at ON public.feed_rations;
CREATE TRIGGER feed_rations_updated_at
  BEFORE UPDATE ON public.feed_rations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  feed_ration_id UUID NOT NULL REFERENCES public.feed_rations(id) ON DELETE RESTRICT,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ownership_group_id UUID REFERENCES public.ownership_groups(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  head_count INTEGER CHECK (head_count IS NULL OR head_count > 0),
  fed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feeding_records_org_idx ON public.feeding_records(organization_id);
CREATE INDEX IF NOT EXISTS feeding_records_fed_idx ON public.feeding_records(organization_id, fed_at DESC);
CREATE INDEX IF NOT EXISTS feeding_records_group_idx ON public.feeding_records(cattle_group_id);

DROP TRIGGER IF EXISTS feeding_records_updated_at ON public.feeding_records;
CREATE TRIGGER feeding_records_updated_at
  BEFORE UPDATE ON public.feeding_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feed_rations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_rations" ON public.feed_rations;
CREATE POLICY "Members read feed_rations"
  ON public.feed_rations FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write feed_rations" ON public.feed_rations;
CREATE POLICY "Managers write feed_rations"
  ON public.feed_rations FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read feeding_records" ON public.feeding_records;
CREATE POLICY "Members read feeding_records"
  ON public.feeding_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create feeding_records" ON public.feeding_records;
CREATE POLICY "Members create feeding_records"
  ON public.feeding_records FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members update feeding or managers update" ON public.feeding_records;
CREATE POLICY "Members update feeding or managers update"
  ON public.feeding_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (public.has_org_role(organization_id, ARRAY['owner', 'manager']) OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Managers delete feeding_records" ON public.feeding_records;
CREATE POLICY "Managers delete feeding_records"
  ON public.feeding_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
