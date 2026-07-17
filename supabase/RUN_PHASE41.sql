-- Run in Supabase SQL Editor: lot purchase invoice history per cattle lot
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.cattle_group_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  arrival_date DATE,
  seller_name TEXT,
  source_name TEXT,
  invoice_ref TEXT,
  head_count INTEGER NOT NULL CHECK (head_count > 0),
  pay_weight_lbs NUMERIC(12, 2) CHECK (pay_weight_lbs IS NULL OR pay_weight_lbs >= 0),
  received_weight_lbs NUMERIC(12, 2) CHECK (received_weight_lbs IS NULL OR received_weight_lbs >= 0),
  purchase_price_per_lb NUMERIC(12, 4) CHECK (purchase_price_per_lb IS NULL OR purchase_price_per_lb >= 0),
  landed_cost NUMERIC(14, 2) CHECK (landed_cost IS NULL OR landed_cost >= 0),
  notes TEXT,
  inventory_adjustment_id UUID REFERENCES public.inventory_adjustments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cattle_group_purchases_group_idx
  ON public.cattle_group_purchases(cattle_group_id, purchased_at DESC);

DROP TRIGGER IF EXISTS cattle_group_purchases_updated_at ON public.cattle_group_purchases;
CREATE TRIGGER cattle_group_purchases_updated_at
  BEFORE UPDATE ON public.cattle_group_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cattle_group_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cattle_group_purchases" ON public.cattle_group_purchases;
CREATE POLICY "Members read cattle_group_purchases"
  ON public.cattle_group_purchases FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cattle_group_purchases" ON public.cattle_group_purchases;
CREATE POLICY "Managers write cattle_group_purchases"
  ON public.cattle_group_purchases FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

INSERT INTO public.cattle_group_purchases (
  organization_id,
  cattle_group_id,
  purchased_at,
  arrival_date,
  seller_name,
  source_name,
  head_count,
  pay_weight_lbs,
  received_weight_lbs,
  purchase_price_per_lb,
  landed_cost,
  notes,
  created_at
)
SELECT
  cg.organization_id,
  cg.id,
  COALESCE(cg.purchase_date, cg.opened_at::date, CURRENT_DATE),
  cg.arrival_date,
  cg.seller_name,
  cg.source_name,
  GREATEST(COALESCE(cg.starting_head, 0), 1),
  cg.pay_weight_lbs,
  cg.received_weight_lbs,
  cg.purchase_price_per_lb,
  cg.landed_cost,
  cg.notes,
  cg.created_at
FROM public.cattle_groups cg
WHERE cg.is_active = TRUE
  AND COALESCE(cg.starting_head, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.cattle_group_purchases p WHERE p.cattle_group_id = cg.id
  );

NOTIFY pgrst, 'reload schema';
