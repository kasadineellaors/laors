-- =============================================================================
-- LAORS Phase 3 — run THIS FILE ONLY (one paste, one Run)
-- =============================================================================
-- Clear the SQL editor completely before pasting this.
-- Do NOT combine with RUN_THIS_IN_SUPABASE.sql or RUN_PHASE2.sql — you already ran those.
--
-- Creates: tasks, treatment_records, time_entries, rainfall_records,
--          medicine_items, medicine_stock_adjustments
-- =============================================================================

-- ========================= RUN_PHASE3.sql ====================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_org_id_idx ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read tasks" ON public.tasks;
CREATE POLICY "Members read tasks"
  ON public.tasks FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create tasks" ON public.tasks;
CREATE POLICY "Members create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update tasks" ON public.tasks;
CREATE POLICY "Members update own or managers update tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete tasks" ON public.tasks;
CREATE POLICY "Managers delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- ========================= RUN_PHASE3B.sql ===================================

CREATE TABLE IF NOT EXISTS public.treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  treatment_type TEXT,
  head_count INTEGER CHECK (head_count IS NULL OR head_count > 0),
  treatment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS treatment_records_org_idx ON public.treatment_records(organization_id);
CREATE INDEX IF NOT EXISTS treatment_records_date_idx ON public.treatment_records(organization_id, treatment_date DESC);

DROP TRIGGER IF EXISTS treatment_records_updated_at ON public.treatment_records;
CREATE TRIGGER treatment_records_updated_at
  BEFORE UPDATE ON public.treatment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_entry_clock_order CHECK (
    clock_out_at IS NULL OR clock_out_at > clock_in_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_open_per_user
  ON public.time_entries(organization_id, user_id)
  WHERE clock_out_at IS NULL;

CREATE INDEX IF NOT EXISTS time_entries_org_user_idx
  ON public.time_entries(organization_id, user_id, clock_in_at DESC);

DROP TRIGGER IF EXISTS time_entries_updated_at ON public.time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.rainfall_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_inches NUMERIC(6, 2) NOT NULL CHECK (amount_inches >= 0),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rainfall_records_org_idx ON public.rainfall_records(organization_id);
CREATE INDEX IF NOT EXISTS rainfall_records_date_idx ON public.rainfall_records(organization_id, recorded_date DESC);

DROP TRIGGER IF EXISTS rainfall_records_updated_at ON public.rainfall_records;
CREATE TRIGGER rainfall_records_updated_at
  BEFORE UPDATE ON public.rainfall_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.treatment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read treatments" ON public.treatment_records;
CREATE POLICY "Members read treatments"
  ON public.treatment_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create treatments" ON public.treatment_records;
CREATE POLICY "Members create treatments"
  ON public.treatment_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update treatments" ON public.treatment_records;
CREATE POLICY "Members update own or managers update treatments"
  ON public.treatment_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete treatments" ON public.treatment_records;
CREATE POLICY "Managers delete treatments"
  ON public.treatment_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read time entries" ON public.time_entries;
CREATE POLICY "Members read time entries"
  ON public.time_entries FOR SELECT
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant'])
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members clock in" ON public.time_entries;
CREATE POLICY "Members clock in"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own time entries" ON public.time_entries;
CREATE POLICY "Members update own time entries"
  ON public.time_entries FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant'])
      OR user_id = auth.uid()
    )
  );

ALTER TABLE public.rainfall_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read rainfall" ON public.rainfall_records;
CREATE POLICY "Members read rainfall"
  ON public.rainfall_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create rainfall" ON public.rainfall_records;
CREATE POLICY "Members create rainfall"
  ON public.rainfall_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND recorded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update rainfall" ON public.rainfall_records;
CREATE POLICY "Members update own or managers update rainfall"
  ON public.rainfall_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR recorded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete rainfall" ON public.rainfall_records;
CREATE POLICY "Managers delete rainfall"
  ON public.rainfall_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- ========================= RUN_PHASE3C.sql ===================================

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
