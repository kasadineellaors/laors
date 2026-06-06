-- LAORS Phase 3C: Medicine inventory + treatment stock link

CREATE TABLE IF NOT EXISTS public.medicine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'dose',
  quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_at NUMERIC(12, 2) CHECK (reorder_at IS NULL OR reorder_at >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS medicine_items_org_idx ON public.medicine_items(organization_id);

DROP TRIGGER IF EXISTS medicine_items_updated_at ON public.medicine_items;
CREATE TRIGGER medicine_items_updated_at
  BEFORE UPDATE ON public.medicine_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.medicine_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  medicine_item_id UUID NOT NULL REFERENCES public.medicine_items(id) ON DELETE CASCADE,
  previous_quantity NUMERIC(12, 2) NOT NULL,
  new_quantity NUMERIC(12, 2) NOT NULL CHECK (new_quantity >= 0),
  delta NUMERIC(12, 2) NOT NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'adjust'
    CHECK (adjustment_type IN ('receive', 'use', 'adjust', 'treatment')),
  treatment_record_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS medicine_stock_adj_item_idx
  ON public.medicine_stock_adjustments(medicine_item_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'treatment_records'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'medicine_stock_adjustments'
        AND constraint_name = 'medicine_stock_adjustments_treatment_record_id_fkey'
    ) THEN
      ALTER TABLE public.medicine_stock_adjustments
        ADD CONSTRAINT medicine_stock_adjustments_treatment_record_id_fkey
        FOREIGN KEY (treatment_record_id)
        REFERENCES public.treatment_records(id) ON DELETE SET NULL;
    END IF;

    ALTER TABLE public.treatment_records
      ADD COLUMN IF NOT EXISTS medicine_item_id UUID;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'treatment_records'
        AND constraint_name = 'treatment_records_medicine_item_id_fkey'
    ) THEN
      ALTER TABLE public.treatment_records
        ADD CONSTRAINT treatment_records_medicine_item_id_fkey
        FOREIGN KEY (medicine_item_id)
        REFERENCES public.medicine_items(id) ON DELETE SET NULL;
    END IF;

    ALTER TABLE public.treatment_records
      ADD COLUMN IF NOT EXISTS quantity_used NUMERIC(12, 2);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'treatment_records'
        AND constraint_name = 'treatment_records_quantity_used_check'
    ) THEN
      ALTER TABLE public.treatment_records
        ADD CONSTRAINT treatment_records_quantity_used_check
        CHECK (quantity_used IS NULL OR quantity_used > 0);
    END IF;
  END IF;
END $$;

ALTER TABLE public.medicine_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read medicine_items" ON public.medicine_items;
CREATE POLICY "Members read medicine_items"
  ON public.medicine_items FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create medicine_items" ON public.medicine_items;
CREATE POLICY "Members create medicine_items"
  ON public.medicine_items FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members update medicine_items" ON public.medicine_items;
CREATE POLICY "Members update medicine_items"
  ON public.medicine_items FOR UPDATE
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers delete medicine_items" ON public.medicine_items;
CREATE POLICY "Managers delete medicine_items"
  ON public.medicine_items FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

ALTER TABLE public.medicine_stock_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read medicine_stock_adjustments" ON public.medicine_stock_adjustments;
CREATE POLICY "Members read medicine_stock_adjustments"
  ON public.medicine_stock_adjustments FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write medicine_stock_adjustments" ON public.medicine_stock_adjustments;
CREATE POLICY "Members write medicine_stock_adjustments"
  ON public.medicine_stock_adjustments FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

NOTIFY pgrst, 'reload schema';
