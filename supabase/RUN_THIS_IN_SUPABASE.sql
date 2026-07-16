-- =============================================================================
-- LAORS — RUN THIS IN SUPABASE (all pending updates)
-- =============================================================================
-- Your database already has the core LAORS tables from earlier phases.
-- Run this ENTIRE file once in Supabase SQL Editor — safe to re-run.
--
-- Dashboard → SQL Editor:
-- https://supabase.com/dashboard/project/mvtswajhbmxdbnssljdg/sql/new
--
-- Includes:
--   • Onboarding RPC fix
--   • Ship polish (treatment invoice dedup)
--   • Phase 17 — Feedstuff inventory + ration ingredients
--   • Phase 18 — Lot-centric groups + processing + mortality
--   • Phase 19 — Feed purchases + % ration inclusion
--   • Phase 20 — Lot expense ledger + auto lot status on sales
--   • Phase 21 — Feed cost snapshots + monthly/enterprise reports
-- =============================================================================

-- =============================================================================
-- ONBOARDING FIX
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_ranch_organization(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_ranch_organization(TEXT, TEXT);

DROP POLICY IF EXISTS "Owners and managers can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Bootstrap owner or managers insert members" ON public.organization_members;

CREATE POLICY "Bootstrap owner or managers insert members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.has_org_role(organization_id, ARRAY['owner', 'manager'])
    OR (
      user_id = auth.uid()
      AND system_role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_id
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_ranch_organization(
  p_name TEXT,
  p_slug TEXT,
  p_state TEXT,
  p_timezone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Ranch name is required';
  END IF;

  INSERT INTO public.organizations (name, slug, state, timezone)
  VALUES (
    trim(p_name),
    p_slug,
    NULLIF(trim(p_state), ''),
    COALESCE(NULLIF(trim(p_timezone), ''), 'America/Chicago')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (
    organization_id, user_id, system_role, joined_at
  )
  VALUES (v_org_id, v_user_id, 'owner', NOW());

  UPDATE public.profiles
  SET default_org_id = v_org_id
  WHERE id = v_user_id;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ranch_organization(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ranch_organization(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- SHIP POLISH — treatment invoice dedup
-- =============================================================================

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS treatment_records_invoice_idx
  ON public.treatment_records(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- =============================================================================
-- PHASE 17 — Feedstuff inventory + ration ingredients
-- =============================================================================

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

-- =============================================================================
-- PHASE 18 — Lot-centric groups + processing + mortality
-- =============================================================================

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS enterprise_type TEXT DEFAULT 'stocker'
    CHECK (enterprise_type IN ('stocker', 'cow_calf', 'breeding', 'raised_calves', 'custom_fed')),
  ADD COLUMN IF NOT EXISTS lot_status TEXT DEFAULT 'active'
    CHECK (lot_status IN ('receiving', 'active', 'hospital', 'ready_to_sell', 'partially_sold', 'closed')),
  ADD COLUMN IF NOT EXISTS opened_at DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS closed_at DATE,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS starting_head INTEGER,
  ADD COLUMN IF NOT EXISTS pay_weight_lbs NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS avg_weight_lbs NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS purchase_price_per_lb NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS landed_cost NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT;

CREATE INDEX IF NOT EXISTS cattle_groups_lot_number_idx
  ON public.cattle_groups(organization_id, lot_number);

CREATE TABLE IF NOT EXISTS public.processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  processed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  head_count INTEGER NOT NULL CHECK (head_count > 0),
  processing_type TEXT NOT NULL DEFAULT 'arrival'
    CHECK (processing_type IN (
      'arrival', 'revaccination', 'branding', 'implanting',
      'pregnancy_check', 'weaning', 'bull_work', 'other'
    )),
  chute_charge NUMERIC(12, 2) DEFAULT 0,
  labor_charge NUMERIC(12, 2) DEFAULT 0,
  processing_fee NUMERIC(12, 2) DEFAULT 0,
  medicine_cost NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS processing_events_group_idx
  ON public.processing_events(cattle_group_id, processed_at DESC);

DROP TRIGGER IF EXISTS processing_events_updated_at ON public.processing_events;
CREATE TRIGGER processing_events_updated_at
  BEFORE UPDATE ON public.processing_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.mortality_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  died_at DATE NOT NULL DEFAULT CURRENT_DATE,
  head_count INTEGER NOT NULL DEFAULT 1 CHECK (head_count > 0),
  cause TEXT,
  disposal_method TEXT,
  value_lost NUMERIC(12, 2),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mortality_records_group_idx
  ON public.mortality_records(cattle_group_id, died_at DESC);

DROP TRIGGER IF EXISTS mortality_records_updated_at ON public.mortality_records;
CREATE TRIGGER mortality_records_updated_at
  BEFORE UPDATE ON public.mortality_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read processing_events" ON public.processing_events;
CREATE POLICY "Members read processing_events"
  ON public.processing_events FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write processing_events" ON public.processing_events;
CREATE POLICY "Members write processing_events"
  ON public.processing_events FOR ALL
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read mortality_records" ON public.mortality_records;
CREATE POLICY "Members read mortality_records"
  ON public.mortality_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write mortality_records" ON public.mortality_records;
CREATE POLICY "Members write mortality_records"
  ON public.mortality_records FOR ALL
  USING (public.is_org_member(organization_id));

-- =============================================================================
-- PHASE 19 — Feed purchases + % ration inclusion
-- =============================================================================

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

-- =============================================================================
-- PHASE 20 — Lot expense ledger
-- =============================================================================

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

-- =============================================================================
-- PHASE 21 — Feed cost snapshots (preserve historical feed costs)
-- =============================================================================

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS total_feed_cost NUMERIC(14, 2);

ALTER TABLE public.feed_rations
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE;

-- =============================================================================
-- PHASE 22 — Ration price history + snapshot backfill
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feed_ration_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_ration_id UUID NOT NULL REFERENCES public.feed_rations(id) ON DELETE CASCADE,
  price_per_unit NUMERIC(12, 4) NOT NULL CHECK (price_per_unit >= 0),
  effective_from DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_ration_price_history_lookup_idx
  ON public.feed_ration_price_history(feed_ration_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS feed_ration_price_history_org_idx
  ON public.feed_ration_price_history(organization_id, effective_from DESC);

ALTER TABLE public.feed_ration_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_ration_price_history" ON public.feed_ration_price_history;
CREATE POLICY "Members read feed_ration_price_history"
  ON public.feed_ration_price_history FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_ration_price_history" ON public.feed_ration_price_history;
CREATE POLICY "Members write feed_ration_price_history"
  ON public.feed_ration_price_history FOR ALL
  USING (public.is_org_member(organization_id));

INSERT INTO public.feed_ration_price_history (
  organization_id,
  feed_ration_id,
  price_per_unit,
  effective_from
)
SELECT
  r.organization_id,
  r.id,
  r.price_per_unit,
  COALESCE(r.effective_from, r.created_at::date, CURRENT_DATE)
FROM public.feed_rations r
WHERE r.price_per_unit IS NOT NULL
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.feed_ration_price_history h
    WHERE h.feed_ration_id = r.id
  );

UPDATE public.feeding_records fr
SET
  unit_cost_snapshot = r.price_per_unit,
  total_feed_cost = ROUND(fr.quantity * r.price_per_unit, 2)
FROM public.feed_rations r
WHERE fr.feed_ration_id = r.id
  AND fr.unit_cost_snapshot IS NULL
  AND fr.is_active = true
  AND r.price_per_unit IS NOT NULL;

-- =============================================================================
-- PHASE 25 — Sale out-weight for closeout gain metrics
-- =============================================================================

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS avg_weight_lbs NUMERIC(12, 2);

-- =============================================================================
-- DONE — reload API schema
-- =============================================================================

NOTIFY pgrst, 'reload schema';

SELECT 'LAORS updates applied successfully' AS status;
