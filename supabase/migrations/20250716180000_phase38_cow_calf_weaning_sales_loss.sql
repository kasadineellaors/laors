-- LAORS Phase 38: Cow-Calf weaning, sales, death/loss (additive; Stocker unchanged)

ALTER TABLE public.weaning_records
  ADD COLUMN IF NOT EXISTS cow_calf_herd_id UUID
    REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_herd_id UUID
    REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_location_id UUID
    REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weaning_method TEXT
    CHECK (weaning_method IS NULL OR weaning_method IN ('traditional', 'fence_line', 'nose_tab', 'early', 'other'));

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS sale_context TEXT NOT NULL DEFAULT 'stocker'
    CHECK (sale_context IN ('stocker', 'cow_calf', 'seedstock')),
  ADD COLUMN IF NOT EXISTS cow_calf_sale_type TEXT
    CHECK (cow_calf_sale_type IS NULL OR cow_calf_sale_type IN (
      'calf', 'cull_cow', 'bull', 'replacement', 'pair', 'group', 'other'
    )),
  ADD COLUMN IF NOT EXISTS fees NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS sale_reason TEXT,
  ADD COLUMN IF NOT EXISTS animal_ids UUID[];

CREATE INDEX IF NOT EXISTS sales_records_cow_calf_context_idx
  ON public.sales_records(organization_id, sale_date DESC)
  WHERE is_active = TRUE AND sale_context = 'cow_calf';

CREATE TABLE IF NOT EXISTS public.cow_calf_loss_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  individual_animal_id UUID NOT NULL REFERENCES public.individual_animals(id) ON DELETE CASCADE,
  cow_calf_herd_id UUID REFERENCES public.cow_calf_herds(id) ON DELETE SET NULL,
  loss_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cause TEXT NOT NULL DEFAULT 'unknown'
    CHECK (cause IN ('unknown', 'disease', 'predator', 'accident', 'calving', 'old_age', 'other')),
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  disposal_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cow_calf_loss_org_idx
  ON public.cow_calf_loss_records(organization_id, loss_date DESC)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS cow_calf_loss_records_updated_at ON public.cow_calf_loss_records;
CREATE TRIGGER cow_calf_loss_records_updated_at
  BEFORE UPDATE ON public.cow_calf_loss_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cow_calf_loss_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cow_calf_loss_records" ON public.cow_calf_loss_records;
CREATE POLICY "Members read cow_calf_loss_records"
  ON public.cow_calf_loss_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cow_calf_loss_records" ON public.cow_calf_loss_records;
CREATE POLICY "Managers write cow_calf_loss_records"
  ON public.cow_calf_loss_records FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
