-- LAORS Phase 4: Sales records

CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  buyer_name TEXT,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  head_count INTEGER NOT NULL CHECK (head_count > 0),
  total_amount NUMERIC(12, 2) CHECK (total_amount IS NULL OR total_amount >= 0),
  price_per_head NUMERIC(12, 2) CHECK (price_per_head IS NULL OR price_per_head >= 0),
  financial_category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_records_org_idx ON public.sales_records(organization_id);
CREATE INDEX IF NOT EXISTS sales_records_date_idx ON public.sales_records(organization_id, sale_date DESC);

DROP TRIGGER IF EXISTS sales_records_updated_at ON public.sales_records;
CREATE TRIGGER sales_records_updated_at
  BEFORE UPDATE ON public.sales_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read sales_records" ON public.sales_records;
CREATE POLICY "Members read sales_records"
  ON public.sales_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create sales_records" ON public.sales_records;
CREATE POLICY "Members create sales_records"
  ON public.sales_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update sales" ON public.sales_records;
CREATE POLICY "Members update own or managers update sales"
  ON public.sales_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete sales_records" ON public.sales_records;
CREATE POLICY "Managers delete sales_records"
  ON public.sales_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
