-- LAORS Phase 18: Lot-centric groups — run after Phase 17

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

NOTIFY pgrst, 'reload schema';
