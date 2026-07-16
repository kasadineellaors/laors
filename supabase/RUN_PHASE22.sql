-- LAORS Phase 22: Ration price history + snapshot backfill — run after Phase 21

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

NOTIFY pgrst, 'reload schema';
