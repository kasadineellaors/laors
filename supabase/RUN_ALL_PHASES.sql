-- LAORS: run ALL feature phases (2-7 + ship polish) in Supabase SQL Editor
-- Prerequisite: base schema from apply-all.sql + RUN_THIS_IN_SUPABASE.sql, OR supabase db push
-- Run this ONE file if you are not using the CLI migration path.

-- ========== RUN_PHASE2.sql ==========
-- LAORS Phase 2: Inventory + partial move engine
-- Run in Supabase SQL Editor if not using db push

-- ---------------------------------------------------------------------------
-- Movement history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cattle_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE RESTRICT,
  destination_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE RESTRICT,
  source_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  movement_reason_id UUID REFERENCES public.movement_reasons(id) ON DELETE SET NULL,
  total_head INT NOT NULL DEFAULT 0 CHECK (total_head >= 0),
  is_partial BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  notes TEXT,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cattle_movements_org_id_idx
  ON public.cattle_movements(organization_id);
CREATE INDEX IF NOT EXISTS cattle_movements_moved_at_idx
  ON public.cattle_movements(moved_at DESC);

DROP TRIGGER IF EXISTS cattle_movements_updated_at ON public.cattle_movements;
CREATE TRIGGER cattle_movements_updated_at
  BEFORE UPDATE ON public.cattle_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cattle_movement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES public.cattle_movements(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES public.cattle_classifications(id) ON DELETE RESTRICT,
  head_count INT NOT NULL CHECK (head_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (movement_id, classification_id)
);

CREATE INDEX IF NOT EXISTS cattle_movement_lines_movement_idx
  ON public.cattle_movement_lines(movement_id);

-- ---------------------------------------------------------------------------
-- Count adjustments (non-move corrections)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES public.cattle_classifications(id) ON DELETE RESTRICT,
  adjustment_reason_id UUID REFERENCES public.adjustment_reasons(id) ON DELETE SET NULL,
  previous_count INT NOT NULL DEFAULT 0 CHECK (previous_count >= 0),
  new_count INT NOT NULL DEFAULT 0 CHECK (new_count >= 0),
  delta INT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_adjustments_group_idx
  ON public.inventory_adjustments(cattle_group_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.cattle_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle_movement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cattle_movements" ON public.cattle_movements;
CREATE POLICY "Members read cattle_movements"
  ON public.cattle_movements FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cattle_movements" ON public.cattle_movements;
CREATE POLICY "Managers write cattle_movements"
  ON public.cattle_movements FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read cattle_movement_lines" ON public.cattle_movement_lines;
CREATE POLICY "Members read cattle_movement_lines"
  ON public.cattle_movement_lines FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write cattle_movement_lines" ON public.cattle_movement_lines;
CREATE POLICY "Managers write cattle_movement_lines"
  ON public.cattle_movement_lines FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Members read inventory_adjustments"
  ON public.inventory_adjustments FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write inventory_adjustments" ON public.inventory_adjustments;
CREATE POLICY "Managers write inventory_adjustments"
  ON public.inventory_adjustments FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- ---------------------------------------------------------------------------
-- Helper: upsert group inventory count (internal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._upsert_group_count(
  p_org_id UUID,
  p_group_id UUID,
  p_classification_id UUID,
  p_delta INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_current INT;
BEGIN
  SELECT head_count INTO v_current
  FROM public.group_inventory_counts
  WHERE cattle_group_id = p_group_id
    AND classification_id = p_classification_id;

  IF NOT FOUND THEN
    IF p_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient head count for classification';
    END IF;
    IF p_delta = 0 THEN
      RETURN;
    END IF;
    INSERT INTO public.group_inventory_counts (
      organization_id, cattle_group_id, classification_id, head_count
    ) VALUES (p_org_id, p_group_id, p_classification_id, p_delta);
    RETURN;
  END IF;

  IF v_current + p_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient head count (have %, need %)', v_current, -p_delta;
  END IF;

  IF v_current + p_delta = 0 THEN
    DELETE FROM public.group_inventory_counts
    WHERE cattle_group_id = p_group_id
      AND classification_id = p_classification_id;
  ELSE
    UPDATE public.group_inventory_counts
    SET head_count = v_current + p_delta,
        updated_at = NOW()
    WHERE cattle_group_id = p_group_id
      AND classification_id = p_classification_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: execute cattle move (partial or full — same workflow)
-- Payload JSON:
-- {
--   "source_group_id": "uuid",
--   "destination_location_id": "uuid",
--   "destination_group_id": "uuid" | null,
--   "movement_reason_id": "uuid" | null,
--   "notes": "text" | null,
--   "moved_at": "timestamptz" | null,
--   "lines": [{ "classification_id": "uuid", "head_count": 5 }]
-- }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_cattle_move(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_source public.cattle_groups%ROWTYPE;
  v_dest_group_id UUID;
  v_dest_group public.cattle_groups%ROWTYPE;
  v_movement_id UUID;
  v_line JSONB;
  v_class_id UUID;
  v_head INT;
  v_total INT := 0;
  v_source_total INT;
  v_moving_total INT;
  v_moved_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_payload IS NULL OR p_payload->'lines' IS NULL THEN
    RAISE EXCEPTION 'Move lines are required';
  END IF;

  SELECT * INTO v_source
  FROM public.cattle_groups
  WHERE id = (p_payload->>'source_group_id')::UUID
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source group not found';
  END IF;

  v_org_id := v_source.organization_id;

  IF NOT public.has_org_role(v_org_id, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = (p_payload->>'destination_location_id')::UUID
      AND organization_id = v_org_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Destination location not found';
  END IF;

  v_moved_at := COALESCE((p_payload->>'moved_at')::TIMESTAMPTZ, NOW());

  -- Validate lines and compute total moving
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_class_id := (v_line->>'classification_id')::UUID;
    v_head := (v_line->>'head_count')::INT;
    IF v_head IS NULL OR v_head <= 0 THEN
      RAISE EXCEPTION 'Each line must have head_count > 0';
    END IF;
    v_total := v_total + v_head;
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Move at least 1 head';
  END IF;

  SELECT COALESCE(SUM(head_count), 0) INTO v_source_total
  FROM public.group_inventory_counts
  WHERE cattle_group_id = v_source.id;

  -- Resolve destination group
  IF p_payload->>'destination_group_id' IS NOT NULL
     AND trim(p_payload->>'destination_group_id') <> '' THEN
    v_dest_group_id := (p_payload->>'destination_group_id')::UUID;
    SELECT * INTO v_dest_group
    FROM public.cattle_groups
    WHERE id = v_dest_group_id
      AND organization_id = v_org_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Destination group not found';
    END IF;

    IF v_dest_group.location_id IS DISTINCT FROM (p_payload->>'destination_location_id')::UUID THEN
      RAISE EXCEPTION 'Destination group is not at the selected location';
    END IF;
  ELSE
    SELECT id INTO v_dest_group_id
    FROM public.cattle_groups
    WHERE organization_id = v_org_id
      AND location_id = (p_payload->>'destination_location_id')::UUID
      AND name = v_source.name
      AND is_active = TRUE
    LIMIT 1;

    IF v_dest_group_id IS NULL THEN
      INSERT INTO public.cattle_groups (
        organization_id, name, location_id, ownership_group_id, origin_group_id
      ) VALUES (
        v_org_id,
        v_source.name,
        (p_payload->>'destination_location_id')::UUID,
        v_source.ownership_group_id,
        v_source.id
      )
      RETURNING id INTO v_dest_group_id;
    END IF;
  END IF;

  -- Apply inventory changes
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_class_id := (v_line->>'classification_id')::UUID;
    v_head := (v_line->>'head_count')::INT;

    PERFORM public._upsert_group_count(v_org_id, v_source.id, v_class_id, -v_head);
    PERFORM public._upsert_group_count(v_org_id, v_dest_group_id, v_class_id, v_head);
  END LOOP;

  INSERT INTO public.cattle_movements (
    organization_id,
    source_group_id,
    destination_group_id,
    source_location_id,
    destination_location_id,
    movement_reason_id,
    total_head,
    is_partial,
    notes,
    moved_at,
    created_by
  ) VALUES (
    v_org_id,
    v_source.id,
    v_dest_group_id,
    v_source.location_id,
    (p_payload->>'destination_location_id')::UUID,
    NULLIF(p_payload->>'movement_reason_id', '')::UUID,
    v_total,
    v_total < v_source_total,
    NULLIF(trim(p_payload->>'notes'), ''),
    v_moved_at,
    v_user_id
  )
  RETURNING id INTO v_movement_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    INSERT INTO public.cattle_movement_lines (
      organization_id, movement_id, classification_id, head_count
    ) VALUES (
      v_org_id,
      v_movement_id,
      (v_line->>'classification_id')::UUID,
      (v_line->>'head_count')::INT
    );
  END LOOP;

  INSERT INTO public.audit_log (
    organization_id, user_id, action, table_name, record_id, new_data
  ) VALUES (
    v_org_id,
    v_user_id,
    'cattle.move',
    'cattle_movements',
    v_movement_id,
    jsonb_build_object(
      'source_group_id', v_source.id,
      'destination_group_id', v_dest_group_id,
      'total_head', v_total
    )
  );

  RETURN v_movement_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: void a move (reverse inventory, editable operations)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_cattle_move(p_movement_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_move public.cattle_movements%ROWTYPE;
  v_line public.cattle_movement_lines%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_move
  FROM public.cattle_movements
  WHERE id = p_movement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement not found';
  END IF;

  IF v_move.status = 'voided' THEN
    RAISE EXCEPTION 'Movement already voided';
  END IF;

  IF NOT public.has_org_role(v_move.organization_id, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR v_line IN
    SELECT * FROM public.cattle_movement_lines WHERE movement_id = p_movement_id
  LOOP
    PERFORM public._upsert_group_count(
      v_move.organization_id, v_move.source_group_id, v_line.classification_id, v_line.head_count
    );
    PERFORM public._upsert_group_count(
      v_move.organization_id, v_move.destination_group_id, v_line.classification_id, -v_line.head_count
    );
  END LOOP;

  UPDATE public.cattle_movements
  SET status = 'voided',
      voided_at = NOW(),
      voided_by = v_user_id
  WHERE id = p_movement_id;

  INSERT INTO public.audit_log (
    organization_id, user_id, action, table_name, record_id, new_data
  ) VALUES (
    v_move.organization_id,
    v_user_id,
    'cattle.move_void',
    'cattle_movements',
    p_movement_id,
    '{}'::jsonb
  );

  RETURN p_movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_cattle_move(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_cattle_move(JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.void_cattle_move(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_cattle_move(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE3_ALL.sql ==========
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

-- ========== RUN_PHASE4.sql ==========
-- LAORS Phase 4: Sales records
-- Run in Supabase SQL Editor after RUN_PHASE3_ALL.sql (or Phase 3/3B/3C)

CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  buyer_name TEXT,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  head_count INTEGER NOT NULL CHECK (head_count > 0),
  total_amount NUMERIC(12, 2) CHECK (total_amount IS NULL OR total_amount >= 0),
  price_per_head NUMERIC(12, 2) CHECK (price_per_head IS NULL OR price_per_head >= 0),
  financial_category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_records_org_idx ON public.sales_records(organization_id);
CREATE INDEX IF NOT EXISTS sales_records_date_idx ON public.sales_records(organization_id, sale_date DESC);

DROP TRIGGER IF EXISTS sales_records_updated_at ON public.sales_records;
CREATE TRIGGER sales_records_updated_at
  BEFORE UPDATE ON public.sales_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read sales_records" ON public.sales_records;
CREATE POLICY "Members read sales_records"
  ON public.sales_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create sales_records" ON public.sales_records;
CREATE POLICY "Members create sales_records"
  ON public.sales_records FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update own or managers update sales" ON public.sales_records;
CREATE POLICY "Members update own or managers update sales"
  ON public.sales_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete sales_records" ON public.sales_records;
CREATE POLICY "Managers delete sales_records"
  ON public.sales_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE5.sql ==========
-- LAORS Phase 5: Invoices + manager time (no new tables for time — UI only)
-- Run in Supabase SQL Editor after RUN_PHASE4.sql

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  sales_record_id UUID REFERENCES public.sales_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_org_idx ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(organization_id, status);

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_idx ON public.invoice_lines(invoice_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read invoices" ON public.invoices;
CREATE POLICY "Members read invoices"
  ON public.invoices FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write invoices" ON public.invoices;
CREATE POLICY "Managers write invoices"
  ON public.invoices FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

DROP POLICY IF EXISTS "Members read invoice_lines" ON public.invoice_lines;
CREATE POLICY "Members read invoice_lines"
  ON public.invoice_lines FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write invoice_lines" ON public.invoice_lines;
CREATE POLICY "Managers write invoice_lines"
  ON public.invoice_lines FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE6.sql ==========
-- LAORS Phase 6: Customers, medicine catalog pricing, invoice customer link
-- Run in Supabase SQL Editor after RUN_PHASE5.sql

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  yardage_rate_per_head_day NUMERIC(12, 4) CHECK (yardage_rate_per_head_day IS NULL OR yardage_rate_per_head_day >= 0),
  medicine_markup_percent NUMERIC(5, 2) CHECK (medicine_markup_percent IS NULL OR medicine_markup_percent >= 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_org_idx ON public.customers(organization_id);

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.medicine_items
  ADD COLUMN IF NOT EXISTS price_per_cc NUMERIC(12, 4) CHECK (price_per_cc IS NULL OR price_per_cc >= 0);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_customer_idx ON public.invoices(customer_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read customers" ON public.customers;
CREATE POLICY "Members read customers"
  ON public.customers FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write customers" ON public.customers;
CREATE POLICY "Managers write customers"
  ON public.customers FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'manager', 'accountant']));

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE7.sql ==========
-- LAORS Phase 7: Customer links for billing + auto invoice generation
-- Run in Supabase SQL Editor after RUN_PHASE6.sql

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cattle_groups_customer_idx ON public.cattle_groups(customer_id);

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_records_customer_idx ON public.sales_records(customer_id);

NOTIFY pgrst, 'reload schema';

-- ========== RUN_SHIP.sql ==========
-- LAORS ship polish: prevent double-billing treatments on generated invoices
-- Run after RUN_PHASE7.sql (or included in RUN_ALL_PHASES.sql)

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS treatment_records_invoice_idx
  ON public.treatment_records(invoice_id)
  WHERE invoice_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

