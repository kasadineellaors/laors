-- Phase 33 — Unified owners, category invoices, medicine costing, misc charges

-- ---------------------------------------------------------------------------
-- Owners (replaces separate customers + ownership groups for app use)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_name TEXT,
  ownership_type TEXT,
  is_ownership_group BOOLEAN NOT NULL DEFAULT FALSE,
  yardage_rate_per_head_day NUMERIC(12, 4) CHECK (yardage_rate_per_head_day IS NULL OR yardage_rate_per_head_day >= 0),
  medicine_markup_percent NUMERIC(5, 2) CHECK (medicine_markup_percent IS NULL OR medicine_markup_percent >= 0),
  feed_markup_percent NUMERIC(5, 2) CHECK (feed_markup_percent IS NULL OR feed_markup_percent >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owners_org_idx ON public.owners(organization_id);

DROP TRIGGER IF EXISTS owners_updated_at ON public.owners;
CREATE TRIGGER owners_updated_at
  BEFORE UPDATE ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.owner_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  member_owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_owner_id, member_owner_id),
  CHECK (group_owner_id <> member_owner_id)
);

CREATE INDEX IF NOT EXISTS owner_group_members_group_idx ON public.owner_group_members(group_owner_id);

-- Migrate customers → owners (preserve ids)
INSERT INTO public.owners (
  id, organization_id, name, email, phone, address,
  yardage_rate_per_head_day, medicine_markup_percent, feed_markup_percent,
  notes, is_active, is_ownership_group, created_at, updated_at
)
SELECT
  id, organization_id, name, email, phone, address,
  yardage_rate_per_head_day, medicine_markup_percent, feed_markup_percent,
  notes, is_active, FALSE, created_at, updated_at
FROM public.customers
ON CONFLICT (id) DO NOTHING;

-- Migrate ownership groups not already imported as customers
INSERT INTO public.owners (
  id, organization_id, name, email, phone, address, contact_name, ownership_type,
  notes, is_active, is_ownership_group, created_at, updated_at
)
SELECT
  og.id, og.organization_id, og.name, og.email, og.phone, og.billing_address,
  og.contact_name, og.ownership_type, og.notes, og.is_active, FALSE,
  og.created_at, og.updated_at
FROM public.ownership_groups og
WHERE NOT EXISTS (SELECT 1 FROM public.owners o WHERE o.id = og.id)
ON CONFLICT (id) DO NOTHING;

-- Lot / billing links
ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;

UPDATE public.cattle_groups cg
SET owner_id = COALESCE(cg.customer_id, cg.ownership_group_id)
WHERE cg.owner_id IS NULL
  AND (cg.customer_id IS NOT NULL OR cg.ownership_group_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS cattle_groups_owner_idx ON public.cattle_groups(owner_id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;

UPDATE public.invoices i
SET owner_id = i.customer_id
WHERE i.owner_id IS NULL AND i.customer_id IS NOT NULL;

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;

UPDATE public.sales_records s
SET owner_id = s.customer_id
WHERE s.owner_id IS NULL AND s.customer_id IS NOT NULL;

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;

UPDATE public.feeding_records fr
SET owner_id = fr.ownership_group_id
WHERE fr.owner_id IS NULL AND fr.ownership_group_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Owner portal (replaces customer portal; same token per owner)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  portal_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_emailed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT owner_portal_access_one_per_owner UNIQUE (owner_id)
);

CREATE INDEX IF NOT EXISTS owner_portal_access_token_idx
  ON public.owner_portal_access(portal_token);

INSERT INTO public.owner_portal_access (
  organization_id, owner_id, portal_token, created_at, last_emailed_at, is_active
)
SELECT organization_id, customer_id, portal_token, created_at, last_emailed_at, is_active
FROM public.customer_portal_access
ON CONFLICT (owner_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Misc charges (logged during month, rolled into invoices)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_misc_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  invoiced_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_misc_charges_owner_date_idx
  ON public.owner_misc_charges(owner_id, charge_date);

DROP TRIGGER IF EXISTS owner_misc_charges_updated_at ON public.owner_misc_charges;
CREATE TRIGGER owner_misc_charges_updated_at
  BEFORE UPDATE ON public.owner_misc_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Medicine weighted-average inventory cost
-- ---------------------------------------------------------------------------
ALTER TABLE public.medicine_items
  ADD COLUMN IF NOT EXISTS avg_unit_cost NUMERIC(12, 4) CHECK (avg_unit_cost IS NULL OR avg_unit_cost >= 0);

UPDATE public.medicine_items
SET avg_unit_cost = price_per_cc
WHERE avg_unit_cost IS NULL AND price_per_cc IS NOT NULL;

ALTER TABLE public.medicine_stock_adjustments
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4) CHECK (unit_cost IS NULL OR unit_cost >= 0);

-- ---------------------------------------------------------------------------
-- Invoice line categories + processing/mortality billing flags
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_lines
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (
    category IS NULL OR category IN ('yardage', 'treatments', 'feed', 'processing', 'misc', 'dead')
  );

ALTER TABLE public.processing_events
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.mortality_records
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_misc_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_portal_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read owners" ON public.owners;
CREATE POLICY "Members read owners"
  ON public.owners FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write owners" ON public.owners;
CREATE POLICY "Managers write owners"
  ON public.owners FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

DROP POLICY IF EXISTS "Members read owner_group_members" ON public.owner_group_members;
CREATE POLICY "Members read owner_group_members"
  ON public.owner_group_members FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write owner_group_members" ON public.owner_group_members;
CREATE POLICY "Managers write owner_group_members"
  ON public.owner_group_members FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

DROP POLICY IF EXISTS "Members read owner_misc_charges" ON public.owner_misc_charges;
CREATE POLICY "Members read owner_misc_charges"
  ON public.owner_misc_charges FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write owner_misc_charges" ON public.owner_misc_charges;
CREATE POLICY "Managers write owner_misc_charges"
  ON public.owner_misc_charges FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

DROP POLICY IF EXISTS "Members read owner portal access" ON public.owner_portal_access;
CREATE POLICY "Members read owner portal access"
  ON public.owner_portal_access FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members manage owner portal access" ON public.owner_portal_access;
CREATE POLICY "Members manage owner portal access"
  ON public.owner_portal_access FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

NOTIFY pgrst, 'reload schema';
