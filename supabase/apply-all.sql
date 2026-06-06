-- =============================================================================
-- LAORS — FULL SCHEMA (brand-new empty Supabase project ONLY)
-- =============================================================================
-- STOP if you already have tables! You will get "relation profiles already exists".
-- In that case run supabase/RUN_THIS_IN_SUPABASE.sql instead (incremental fix).
-- =============================================================================

-- LAORS Phase 0: Platform foundation
-- Run via Supabase CLI: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  default_org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organizations (Ranch)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  enabled_modes TEXT[] NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_org_id_fkey
  FOREIGN KEY (default_org_id) REFERENCES public.organizations(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Permissions (system seed — not ranch-facing)
-- ---------------------------------------------------------------------------
CREATE TABLE public.permissions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE public.role_permissions (
  system_role TEXT NOT NULL,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (system_role, permission_id)
);

INSERT INTO public.permissions (id, description, category) VALUES
  ('org.settings', 'Manage ranch settings', 'org'),
  ('org.users', 'Manage team and roles', 'org'),
  ('dashboard.view', 'View dashboard', 'operations'),
  ('time.clock', 'Clock in and out', 'operations'),
  ('time.view_all', 'View all time entries', 'operations'),
  ('jobs.create', 'Create and assign jobs', 'operations'),
  ('jobs.complete', 'Complete assigned jobs', 'operations'),
  ('inventory.view', 'View inventory', 'inventory'),
  ('inventory.write', 'Edit inventory and moves', 'inventory'),
  ('treatments.write', 'Log treatments', 'health'),
  ('treatments.view', 'View treatments', 'health'),
  ('medicine.manage', 'Manage medicine inventory', 'health'),
  ('land.manage', 'Manage land and locations', 'land'),
  ('sales.write', 'Create sales records', 'financial'),
  ('sales.view', 'View sales records', 'financial'),
  ('invoices.write', 'Create and edit invoices', 'financial'),
  ('invoices.view', 'View invoices', 'financial'),
  ('reports.view', 'View reports', 'reports'),
  ('reports.export', 'Export reports', 'reports');

-- Owner: all permissions
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'owner', id FROM public.permissions;

-- Manager
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'manager', id FROM public.permissions
WHERE id NOT IN ('org.settings', 'org.users');

-- Worker
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'worker', unnest(ARRAY[
  'dashboard.view', 'time.clock', 'jobs.complete',
  'inventory.view', 'treatments.write', 'treatments.view'
]);

-- Accountant
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'accountant', unnest(ARRAY[
  'dashboard.view', 'inventory.view', 'treatments.view',
  'sales.view', 'sales.write', 'invoices.view', 'invoices.write',
  'reports.view', 'reports.export'
]);

-- Veterinarian
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'veterinarian', unnest(ARRAY[
  'dashboard.view', 'inventory.view', 'treatments.view', 'treatments.write'
]);

-- Viewer
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'viewer', unnest(ARRAY[
  'dashboard.view', 'inventory.view', 'treatments.view',
  'sales.view', 'invoices.view', 'reports.view'
]);

-- Stocker owner (external)
INSERT INTO public.role_permissions (system_role, permission_id)
SELECT 'stocker_owner', unnest(ARRAY[
  'dashboard.view', 'inventory.view', 'invoices.view', 'reports.view'
]);

-- ---------------------------------------------------------------------------
-- Ranch roles (custom display titles → system tier)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ranch_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_system_role TEXT NOT NULL CHECK (base_system_role IN (
    'owner', 'manager', 'worker', 'accountant', 'veterinarian', 'viewer', 'stocker_owner'
  )),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TRIGGER ranch_roles_updated_at
  BEFORE UPDATE ON public.ranch_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Organization members
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_role TEXT NOT NULL DEFAULT 'worker' CHECK (system_role IN (
    'owner', 'manager', 'worker', 'accountant', 'veterinarian', 'viewer', 'stocker_owner'
  )),
  ranch_role_id UUID REFERENCES public.ranch_roles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_email TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX organization_members_org_id_idx ON public.organization_members(organization_id);

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_org_id_idx ON public.audit_log(organization_id);
CREATE INDEX audit_log_created_at_idx ON public.audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND system_role = ANY(roles)
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_orgs()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranch_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Org members can view co-member profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id IN (SELECT public.current_user_orgs())
    )
  );

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (public.has_org_role(id, ARRAY['owner']));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members
CREATE POLICY "Members can view org membership"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Owners and managers can insert members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners and managers can update members"
  ON public.organization_members FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- Ranch roles
CREATE POLICY "Members can view ranch roles"
  ON public.ranch_roles FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Owners can manage ranch roles"
  ON public.ranch_roles FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner']));

-- Permissions (read-only for authenticated)
CREATE POLICY "Authenticated can read permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated can read role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

-- Audit log
CREATE POLICY "Owners and managers can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Authenticated can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- LAORS Phase 1: Ranch config layer
-- Location tree, classifications, groups, ownership, ranch dictionary

-- ---------------------------------------------------------------------------
-- Location types (ranch-defined labels; tier is system constraint only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.location_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plural_name TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('property', 'location')),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TRIGGER location_types_updated_at
  BEFORE UPDATE ON public.location_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Location statuses (ranch-defined)
-- ---------------------------------------------------------------------------
CREATE TABLE public.location_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TRIGGER location_statuses_updated_at
  BEFORE UPDATE ON public.location_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Locations (3-level tree: property → location → sub-location)
-- ---------------------------------------------------------------------------
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_type_id UUID NOT NULL REFERENCES public.location_types(id),
  parent_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  acres NUMERIC(10, 2),
  capacity_head INT,
  status_id UUID REFERENCES public.location_statuses(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  path LTREE,
  depth INT NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX locations_org_id_idx ON public.locations(organization_id);
CREATE INDEX locations_parent_id_idx ON public.locations(parent_id);
CREATE INDEX locations_path_gist_idx ON public.locations USING GIST (path);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Path segment from UUID (ltree labels must be alphanumeric/underscore)
CREATE OR REPLACE FUNCTION public.location_path_segment(loc_id UUID)
RETURNS TEXT AS $$
  SELECT 'n' || replace(loc_id::text, '-', '');
$$ LANGUAGE sql IMMUTABLE;

-- Validate tier vs depth and set path
CREATE OR REPLACE FUNCTION public.locations_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  parent_row public.locations%ROWTYPE;
  type_tier TEXT;
  parent_type_tier TEXT;
BEGIN
  SELECT tier INTO type_tier FROM public.location_types WHERE id = NEW.location_type_id;

  IF NEW.parent_id IS NULL THEN
    IF type_tier <> 'property' THEN
      RAISE EXCEPTION 'Root nodes must use a property-tier location type';
    END IF;
    NEW.depth := 0;
    NEW.path := public.location_path_segment(NEW.id)::ltree;
  ELSE
    IF type_tier <> 'location' THEN
      RAISE EXCEPTION 'Child nodes must use a location-tier type';
    END IF;

    SELECT * INTO parent_row FROM public.locations WHERE id = NEW.parent_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent location not found';
    END IF;
    IF parent_row.organization_id <> NEW.organization_id THEN
      RAISE EXCEPTION 'Parent must belong to the same organization';
    END IF;

    NEW.depth := parent_row.depth + 1;
    IF NEW.depth > 2 THEN
      RAISE EXCEPTION 'Maximum depth is 2 (property → location → sub-location)';
    END IF;

    NEW.path := parent_row.path || public.location_path_segment(NEW.id)::ltree;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_path_trigger
  BEFORE INSERT OR UPDATE OF parent_id, location_type_id, id
  ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.locations_before_insert_update();

-- Cascade path updates when parent changes (reparent)
CREATE OR REPLACE FUNCTION public.locations_reparent_descendants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.path IS DISTINCT FROM NEW.path) THEN
    UPDATE public.locations child
    SET
      path = NEW.path || subpath(child.path, nlevel(OLD.path)),
      depth = NEW.depth + (nlevel(child.path) - nlevel(OLD.path))
    WHERE child.path <@ OLD.path
      AND child.id <> NEW.id
      AND child.organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_reparent_trigger
  AFTER UPDATE OF path ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.locations_reparent_descendants();

-- Unique name among siblings
CREATE UNIQUE INDEX locations_sibling_name_unique
  ON public.locations (organization_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- ---------------------------------------------------------------------------
-- Cattle classifications (ranch-defined)
-- ---------------------------------------------------------------------------
CREATE TABLE public.cattle_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  tracks_individual BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TRIGGER cattle_classifications_updated_at
  BEFORE UPDATE ON public.cattle_classifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ownership groups (stocker owners, partners, ranch-owned)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ownership_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ownership_type TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TRIGGER ownership_groups_updated_at
  BEFORE UPDATE ON public.ownership_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cattle groups
-- ---------------------------------------------------------------------------
CREATE TABLE public.cattle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ownership_group_id UUID REFERENCES public.ownership_groups(id) ON DELETE SET NULL,
  origin_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cattle_groups_location_id_idx ON public.cattle_groups(location_id);
CREATE INDEX cattle_groups_org_id_idx ON public.cattle_groups(organization_id);

CREATE TRIGGER cattle_groups_updated_at
  BEFORE UPDATE ON public.cattle_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.group_inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES public.cattle_classifications(id) ON DELETE RESTRICT,
  head_count INT NOT NULL DEFAULT 0 CHECK (head_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cattle_group_id, classification_id)
);

CREATE INDEX group_inventory_counts_group_idx ON public.group_inventory_counts(cattle_group_id);

-- ---------------------------------------------------------------------------
-- Ranch dictionary: reasons & categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.movement_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE public.adjustment_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense', 'cost_of_goods')),
  parent_category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

-- ---------------------------------------------------------------------------
-- Seed defaults for new ranches
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_ranch_defaults(
  p_org_id UUID,
  p_modes TEXT[] DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  IF NOT public.has_org_role(p_org_id, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not authorized to seed ranch defaults';
  END IF;
  -- Location statuses
  INSERT INTO public.location_statuses (organization_id, name, color, sort_order)
  SELECT p_org_id, v.name, v.color, v.sort_order
  FROM (VALUES
    ('Active', '#87A96B', 0),
    ('Resting', '#C4A35A', 1),
    ('Closed', '#36454F', 2)
  ) AS v(name, color, sort_order)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Property tier type (ranch can rename later)
  INSERT INTO public.location_types (organization_id, name, plural_name, tier, sort_order)
  VALUES (p_org_id, 'Property', 'Properties', 'property', 0)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Movement reasons
  INSERT INTO public.movement_reasons (organization_id, name, sort_order)
  SELECT p_org_id, v.name, v.ord FROM (VALUES
    ('Rotation', 0), ('Sale', 1), ('Purchase', 2), ('Processing', 3), ('Treatment', 4)
  ) AS v(name, ord)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Adjustment reasons
  INSERT INTO public.adjustment_reasons (organization_id, name, sort_order)
  SELECT p_org_id, v.name, v.ord FROM (VALUES
    ('Death', 0), ('Missing', 1), ('Born', 2), ('Gather Correction', 3),
    ('Purchased', 4), ('Theft', 5)
  ) AS v(name, ord)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Task categories
  INSERT INTO public.task_categories (organization_id, name, sort_order)
  SELECT p_org_id, v.name, v.ord FROM (VALUES
    ('Fence', 0), ('Water', 1), ('Feeding', 2), ('Processing', 3), ('Doctoring', 4)
  ) AS v(name, ord)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Financial categories
  INSERT INTO public.financial_categories (organization_id, name, category_type, sort_order)
  SELECT p_org_id, v.name, v.ct, v.ord FROM (VALUES
    ('Cattle Sales', 'income', 0),
    ('Hay Sales', 'income', 1),
    ('Feed', 'expense', 0),
    ('Yardage', 'expense', 1),
    ('Medicine', 'expense', 2),
    ('Processing', 'expense', 3),
    ('Labor', 'expense', 4)
  ) AS v(name, ct, ord)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Cow-calf classifications
  IF 'cow_calf' = ANY(p_modes) THEN
    INSERT INTO public.cattle_classifications (organization_id, name, short_code, sort_order)
    SELECT p_org_id, v.name, v.code, v.ord FROM (VALUES
      ('Bull', 'BU', 0), ('Cow', 'CW', 1), ('Steer', 'ST', 2), ('Heifer', 'HF', 3),
      ('Replacement Heifer', 'RH', 4), ('Weaned Calf', 'WC', 5), ('Bred Heifer', 'BH', 6)
    ) AS v(name, code, ord)
    ON CONFLICT (organization_id, name) DO NOTHING;
  END IF;

  -- Stocker classifications
  IF 'stocker' = ANY(p_modes) THEN
    INSERT INTO public.cattle_classifications (organization_id, name, short_code, sort_order)
    SELECT p_org_id, v.name, v.code, v.ord FROM (VALUES
      ('Stocker', 'SK', 0), ('Feeder', 'FD', 1)
    ) AS v(name, code, ord)
    ON CONFLICT (organization_id, name) DO NOTHING;
  END IF;

  -- Default ranch-owned ownership group for stocker
  IF 'stocker' = ANY(p_modes) THEN
    INSERT INTO public.ownership_groups (organization_id, name, ownership_type)
    VALUES (p_org_id, 'Ranch Owned', 'ranch')
    ON CONFLICT (organization_id, name) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.seed_ranch_defaults(UUID, TEXT[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.location_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- Read: all org members
-- Write: owner + manager

CREATE POLICY "Members read location_types"
  ON public.location_types FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write location_types"
  ON public.location_types FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read location_statuses"
  ON public.location_statuses FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write location_statuses"
  ON public.location_statuses FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read locations"
  ON public.locations FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write locations"
  ON public.locations FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read cattle_classifications"
  ON public.cattle_classifications FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write cattle_classifications"
  ON public.cattle_classifications FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read ownership_groups"
  ON public.ownership_groups FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write ownership_groups"
  ON public.ownership_groups FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read cattle_groups"
  ON public.cattle_groups FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write cattle_groups"
  ON public.cattle_groups FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read group_inventory_counts"
  ON public.group_inventory_counts FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write group_inventory_counts"
  ON public.group_inventory_counts FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read movement_reasons"
  ON public.movement_reasons FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write movement_reasons"
  ON public.movement_reasons FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read adjustment_reasons"
  ON public.adjustment_reasons FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write adjustment_reasons"
  ON public.adjustment_reasons FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read financial_categories"
  ON public.financial_categories FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write financial_categories"
  ON public.financial_categories FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Members read task_categories"
  ON public.task_categories FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Managers write task_categories"
  ON public.task_categories FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));
-- Fix ranch onboarding RLS bootstrap
-- Run in Supabase SQL Editor if onboarding fails with organizations RLS error

-- ---------------------------------------------------------------------------
-- organization_members: allow first owner bootstrap OR manager invite
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners and managers can insert members" ON public.organization_members;

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

-- ---------------------------------------------------------------------------
-- Atomic ranch creation (bypasses SELECT-after-INSERT chicken-and-egg)
-- ---------------------------------------------------------------------------
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

NOTIFY pgrst, 'reload schema';
