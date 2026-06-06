-- =============================================================================
-- LAORS — RUN THIS FILE (NOT apply-all.sql)
-- =============================================================================
-- Your database ALREADY has tables (profiles, organizations, etc.).
-- If you see "relation profiles already exists", you ran apply-all.sql by
-- mistake — ignore that error, clear the editor, and run ONLY this file.
--
-- Dashboard → SQL Editor:
-- https://supabase.com/dashboard/project/mvtswajhbmxdbnssljdg/sql/new
--
-- Safe to re-run. Does NOT create tables — only fixes onboarding + RPC.
-- =============================================================================

-- Clean up old function signatures (PostgREST is picky)
DROP FUNCTION IF EXISTS public.create_ranch_organization(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_ranch_organization(TEXT, TEXT);

-- ---------------------------------------------------------------------------
-- RLS: allow first owner to join a new ranch
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RPC: create ranch + owner membership + default org (bypasses RLS safely)
-- All 4 params required (no defaults) so PostgREST finds the function reliably
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

-- Reload API schema cache
NOTIFY pgrst, 'reload schema';

-- Verify (should return one row with 4 text args)
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_ranch_organization';
