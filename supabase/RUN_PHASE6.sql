-- LAORS Phase 6: Customers, medicine catalog pricing, invoice customer link
-- Run in Supabase SQL Editor after RUN_PHASE5.sql

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  yardage_rate_per_head_day NUMERIC(12, 4) CHECK (yardage_rate_per_head_day IS NULL OR yardage_rate_per_head_day >= 0),
  medicine_markup_percent NUMERIC(5, 2) CHECK (medicine_markup_percent IS NULL OR medicine_markup_percent >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_org_idx ON public.customers(organization_id);

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.medicine_items
  ADD COLUMN IF NOT EXISTS price_per_cc NUMERIC(12, 4) CHECK (price_per_cc IS NULL OR price_per_cc >= 0);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_customer_idx ON public.invoices(customer_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read customers" ON public.customers;
CREATE POLICY "Members read customers"
  ON public.customers FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write customers" ON public.customers;
CREATE POLICY "Managers write customers"
  ON public.customers FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

NOTIFY pgrst, 'reload schema';
