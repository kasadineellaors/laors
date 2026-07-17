-- LAORS Phase 39: Lot label presets for receive dropdowns — run after Phase 38

CREATE TABLE IF NOT EXISTS public.lot_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS lot_labels_org_idx
  ON public.lot_labels(organization_id, sort_order, name);

ALTER TABLE public.lot_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read lot_labels" ON public.lot_labels;
CREATE POLICY "Members read lot_labels"
  ON public.lot_labels FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write lot_labels" ON public.lot_labels;
CREATE POLICY "Managers write lot_labels"
  ON public.lot_labels FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
