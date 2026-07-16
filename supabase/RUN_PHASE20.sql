-- LAORS Phase 20: Lot expense ledger — run after Phase 19

CREATE TABLE IF NOT EXISTS public.lot_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  financial_category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lot_expenses_group_idx
  ON public.lot_expenses(cattle_group_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS lot_expenses_org_idx
  ON public.lot_expenses(organization_id, expense_date DESC);

DROP TRIGGER IF EXISTS lot_expenses_updated_at ON public.lot_expenses;
CREATE TRIGGER lot_expenses_updated_at
  BEFORE UPDATE ON public.lot_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lot_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read lot_expenses" ON public.lot_expenses;
CREATE POLICY "Members read lot_expenses"
  ON public.lot_expenses FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write lot_expenses" ON public.lot_expenses;
CREATE POLICY "Members write lot_expenses"
  ON public.lot_expenses FOR ALL
  USING (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
