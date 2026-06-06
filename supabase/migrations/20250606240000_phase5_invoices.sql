-- LAORS Phase 5: Invoices

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  sales_record_id UUID REFERENCES public.sales_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_org_idx ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(organization_id, status);

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON public.invoice_lines(invoice_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read invoices" ON public.invoices;
CREATE POLICY "Members read invoices"
  ON public.invoices FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write invoices" ON public.invoices;
CREATE POLICY "Managers write invoices"
  ON public.invoices FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

DROP POLICY IF EXISTS "Members read invoice_lines" ON public.invoice_lines;
CREATE POLICY "Members read invoice_lines"
  ON public.invoice_lines FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write invoice_lines" ON public.invoice_lines;
CREATE POLICY "Managers write invoice_lines"
  ON public.invoice_lines FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

NOTIFY pgrst, 'reload schema';
