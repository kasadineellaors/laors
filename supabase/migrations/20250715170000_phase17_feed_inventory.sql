-- LAORS Phase 17: Feedstuff inventory + ration ingredients

CREATE TABLE IF NOT EXISTS public.feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ton',
  quantity_on_hand NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_at NUMERIC(12, 4),
  price_per_unit NUMERIC(12, 4),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS feed_items_org_idx ON public.feed_items(organization_id);

DROP TRIGGER IF EXISTS feed_items_updated_at ON public.feed_items;
CREATE TRIGGER feed_items_updated_at
  BEFORE UPDATE ON public.feed_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feed_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  previous_quantity NUMERIC(12, 4) NOT NULL,
  new_quantity NUMERIC(12, 4) NOT NULL,
  delta NUMERIC(12, 4) NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (
    adjustment_type IN ('receive', 'use', 'adjust', 'feeding')
  ),
  feeding_record_id UUID REFERENCES public.feeding_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_stock_adj_item_idx
  ON public.feed_stock_adjustments(feed_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feed_ration_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_ration_id UUID NOT NULL REFERENCES public.feed_rations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE RESTRICT,
  quantity_per_ration_unit NUMERIC(12, 4) NOT NULL CHECK (quantity_per_ration_unit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_ration_id, feed_item_id)
);

CREATE INDEX IF NOT EXISTS feed_ration_ingredients_ration_idx
  ON public.feed_ration_ingredients(feed_ration_id);

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_ration_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_items" ON public.feed_items;
CREATE POLICY "Members read feed_items"
  ON public.feed_items FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_items" ON public.feed_items;
CREATE POLICY "Members write feed_items"
  ON public.feed_items FOR ALL
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read feed_stock_adjustments" ON public.feed_stock_adjustments;
CREATE POLICY "Members read feed_stock_adjustments"
  ON public.feed_stock_adjustments FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_stock_adjustments" ON public.feed_stock_adjustments;
CREATE POLICY "Members write feed_stock_adjustments"
  ON public.feed_stock_adjustments FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read feed_ration_ingredients" ON public.feed_ration_ingredients;
CREATE POLICY "Members read feed_ration_ingredients"
  ON public.feed_ration_ingredients FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write feed_ration_ingredients" ON public.feed_ration_ingredients;
CREATE POLICY "Managers write feed_ration_ingredients"
  ON public.feed_ration_ingredients FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
