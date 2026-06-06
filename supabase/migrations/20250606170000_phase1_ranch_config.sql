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
