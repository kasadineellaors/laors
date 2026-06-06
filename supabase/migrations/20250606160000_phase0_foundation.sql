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
