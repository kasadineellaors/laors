-- LAORS Phase 40: Per-member app module visibility (what they can see in nav)

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS visible_modules TEXT[] NULL;

COMMENT ON COLUMN public.organization_members.visible_modules IS
  'Optional override for app areas (dashboard, cattle, feed, etc.). NULL = use role preset. Owners always see everything.';

NOTIFY pgrst, 'reload schema';
