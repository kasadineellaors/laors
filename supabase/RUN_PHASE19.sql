-- LAORS Phase 19: Feed purchases + % ration inclusion — run after Phase 18

CREATE TABLE IF NOT EXISTS public.feed_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(14, 2) NOT NULL CHECK (total_cost >= 0),
  invoice_ref TEXT,
  notes TEXT,
  feed_stock_adjustment_id UUID REFERENCES public.feed_stock_adjustments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_purchases_item_idx
  ON public.feed_purchases(feed_item_id, purchased_at DESC);

DROP TRIGGER IF EXISTS feed_purchases_updated_at ON public.feed_purchases;
CREATE TRIGGER feed_purchases_updated_at
  BEFORE UPDATE ON public.feed_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feed_stock_adjustments
  ADD COLUMN IF NOT EXISTS feed_purchase_id UUID REFERENCES public.feed_purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4);

ALTER TABLE public.feed_ration_ingredients
  ADD COLUMN IF NOT EXISTS inclusion_percent NUMERIC(6, 3);

ALTER TABLE public.feed_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_purchases" ON public.feed_purchases;
CREATE POLICY "Members read feed_purchases"
  ON public.feed_purchases FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_purchases" ON public.feed_purchases;
CREATE POLICY "Members write feed_purchases"
  ON public.feed_purchases FOR ALL
  USING (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
