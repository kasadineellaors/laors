-- Phase 48 — The Foreman enhancements: death weight, shipping, misc charge fields
-- Run in Supabase SQL Editor
--
-- IMPORTANT: Run this ENTIRE script from top to bottom in one go.
-- If a previous run failed, PostgreSQL rolled back — the shipping tables do not exist yet.
-- Do NOT run only the policy section at the bottom by itself.

ALTER TABLE public.mortality_records
  ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(12, 2);

ALTER TABLE public.cow_calf_loss_records
  ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(12, 2);

ALTER TABLE public.owner_misc_charges
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS individual_animal_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS owner_misc_charges_location_idx
  ON public.owner_misc_charges(location_id)
  WHERE location_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.cow_calf_shipping_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipped_at DATE NOT NULL DEFAULT CURRENT_DATE,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  head_count INTEGER NOT NULL DEFAULT 1 CHECK (head_count > 0),
  weight_lbs NUMERIC(12, 2),
  cow_calf_herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  source_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  source_name TEXT,
  destination_name TEXT,
  reason TEXT NOT NULL DEFAULT 'other'
    CHECK (reason IN ('transfer', 'grazing_lease', 'feedyard', 'sale_barn', 'return_to_owner', 'other')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cow_calf_shipping_org_idx
  ON public.cow_calf_shipping_records(organization_id, shipped_at DESC);

DROP TRIGGER IF EXISTS cow_calf_shipping_updated_at ON public.cow_calf_shipping_records;
CREATE TRIGGER cow_calf_shipping_updated_at
  BEFORE UPDATE ON public.cow_calf_shipping_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cow_calf_shipping_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cow_calf_shipping_select ON public.cow_calf_shipping_records;
CREATE POLICY cow_calf_shipping_select ON public.cow_calf_shipping_records
  FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS cow_calf_shipping_write ON public.cow_calf_shipping_records;
CREATE POLICY cow_calf_shipping_write ON public.cow_calf_shipping_records
  FOR ALL USING (public.is_org_member(organization_id));

CREATE TABLE IF NOT EXISTS public.cattle_shipping_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  shipped_at DATE NOT NULL DEFAULT CURRENT_DATE,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  head_count INTEGER NOT NULL DEFAULT 1 CHECK (head_count > 0),
  weight_lbs NUMERIC(12, 2),
  source_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  source_name TEXT,
  destination_name TEXT,
  reason TEXT NOT NULL DEFAULT 'other'
    CHECK (reason IN ('transfer', 'grazing_lease', 'feedyard', 'sale_barn', 'return_to_owner', 'other')),
  notes TEXT,
  inventory_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cattle_shipping_org_idx
  ON public.cattle_shipping_records(organization_id, shipped_at DESC);

DROP TRIGGER IF EXISTS cattle_shipping_updated_at ON public.cattle_shipping_records;
CREATE TRIGGER cattle_shipping_updated_at
  BEFORE UPDATE ON public.cattle_shipping_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cattle_shipping_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cattle_shipping_select ON public.cattle_shipping_records;
CREATE POLICY cattle_shipping_select ON public.cattle_shipping_records
  FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS cattle_shipping_write ON public.cattle_shipping_records;
CREATE POLICY cattle_shipping_write ON public.cattle_shipping_records
  FOR ALL USING (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
