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

-- ========== RUN_PHASE8.sql ==========
-- LAORS Phase 8: Cow-calf — calving records + individual animals (bulls)

CREATE TABLE IF NOT EXISTS public.calving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  dam_tag TEXT,
  sire_tag TEXT,
  calf_tag TEXT,
  calf_sex TEXT NOT NULL DEFAULT 'unknown'
    CHECK (calf_sex IN ('bull_calf', 'heifer_calf', 'unknown')),
  birth_weight_lbs NUMERIC(8, 2)
    CHECK (birth_weight_lbs IS NULL OR birth_weight_lbs >= 0),
  outcome TEXT NOT NULL DEFAULT 'live'
    CHECK (outcome IN ('live', 'stillborn', 'died')),
  classification_id UUID REFERENCES public.cattle_classifications(id) ON DELETE SET NULL,
  add_to_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_added BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calving_records_org_idx ON public.calving_records(organization_id);
CREATE INDEX IF NOT EXISTS calving_records_date_idx ON public.calving_records(organization_id, calved_at DESC);

DROP TRIGGER IF EXISTS calving_records_updated_at ON public.calving_records;
CREATE TRIGGER calving_records_updated_at
  BEFORE UPDATE ON public.calving_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.individual_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag_number TEXT NOT NULL,
  name TEXT,
  animal_type TEXT NOT NULL DEFAULT 'bull'
    CHECK (animal_type IN ('bull', 'cow', 'other')),
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'dead', 'archived')),
  birth_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, tag_number)
);

CREATE INDEX IF NOT EXISTS individual_animals_org_idx ON public.individual_animals(organization_id);

DROP TRIGGER IF EXISTS individual_animals_updated_at ON public.individual_animals;
CREATE TRIGGER individual_animals_updated_at
  BEFORE UPDATE ON public.individual_animals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read calving_records" ON public.calving_records;
CREATE POLICY "Members read calving_records"
  ON public.calving_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create calving_records" ON public.calving_records;
CREATE POLICY "Members create calving_records"
  ON public.calving_records FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members update calving or managers update" ON public.calving_records;
CREATE POLICY "Members update calving or managers update"
  ON public.calving_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (public.has_org_role(organization_id, ARRAY['owner', 'manager']) OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Managers delete calving_records" ON public.calving_records;
CREATE POLICY "Managers delete calving_records"
  ON public.calving_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read individual_animals" ON public.individual_animals;
CREATE POLICY "Members read individual_animals"
  ON public.individual_animals FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write individual_animals" ON public.individual_animals;
CREATE POLICY "Managers write individual_animals"
  ON public.individual_animals FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';

-- ========== Phase 9: Breeding records ==========

CREATE TABLE IF NOT EXISTS public.breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  dam_tag TEXT,
  bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  sire_tag TEXT,
  breeding_method TEXT NOT NULL DEFAULT 'natural'
    CHECK (breeding_method IN ('natural', 'ai', 'embryo', 'other')),
  expected_calving_date DATE,
  pregnancy_status TEXT NOT NULL DEFAULT 'bred'
    CHECK (pregnancy_status IN ('bred', 'confirmed', 'open', 'unknown')),
  pregnancy_check_date DATE,
  calving_record_id UUID REFERENCES public.calving_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS breeding_records_org_idx ON public.breeding_records(organization_id);
CREATE INDEX IF NOT EXISTS breeding_records_bred_idx ON public.breeding_records(organization_id, bred_at DESC);

DROP TRIGGER IF EXISTS breeding_records_updated_at ON public.breeding_records;
CREATE TRIGGER breeding_records_updated_at
  BEFORE UPDATE ON public.breeding_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read breeding_records" ON public.breeding_records;
CREATE POLICY "Members read breeding_records"
  ON public.breeding_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create breeding_records" ON public.breeding_records;
CREATE POLICY "Members create breeding_records"
  ON public.breeding_records FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members update breeding or managers update" ON public.breeding_records;
CREATE POLICY "Members update breeding or managers update"
  ON public.breeding_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (public.has_org_role(organization_id, ARRAY['owner', 'manager']) OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Managers delete breeding_records" ON public.breeding_records;
CREATE POLICY "Managers delete breeding_records"
  ON public.breeding_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';

-- ========== Phase 10: Treatment reason, feed rations, feeding ==========

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS feed_markup_percent NUMERIC(5, 2);

CREATE TABLE IF NOT EXISTS public.feed_rations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ton',
  price_per_unit NUMERIC(12, 4),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS feed_rations_org_idx ON public.feed_rations(organization_id);

DROP TRIGGER IF EXISTS feed_rations_updated_at ON public.feed_rations;
CREATE TRIGGER feed_rations_updated_at
  BEFORE UPDATE ON public.feed_rations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  feed_ration_id UUID NOT NULL REFERENCES public.feed_rations(id) ON DELETE RESTRICT,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ownership_group_id UUID REFERENCES public.ownership_groups(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  head_count INTEGER CHECK (head_count IS NULL OR head_count > 0),
  fed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feeding_records_org_idx ON public.feeding_records(organization_id);
CREATE INDEX IF NOT EXISTS feeding_records_fed_idx ON public.feeding_records(organization_id, fed_at DESC);
CREATE INDEX IF NOT EXISTS feeding_records_group_idx ON public.feeding_records(cattle_group_id);

DROP TRIGGER IF EXISTS feeding_records_updated_at ON public.feeding_records;
CREATE TRIGGER feeding_records_updated_at
  BEFORE UPDATE ON public.feeding_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feed_rations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_rations" ON public.feed_rations;
CREATE POLICY "Members read feed_rations"
  ON public.feed_rations FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write feed_rations" ON public.feed_rations;
CREATE POLICY "Managers write feed_rations"
  ON public.feed_rations FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "Members read feeding_records" ON public.feeding_records;
CREATE POLICY "Members read feeding_records"
  ON public.feeding_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create feeding_records" ON public.feeding_records;
CREATE POLICY "Members create feeding_records"
  ON public.feeding_records FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members update feeding or managers update" ON public.feeding_records;
CREATE POLICY "Members update feeding or managers update"
  ON public.feeding_records FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (public.has_org_role(organization_id, ARRAY['owner', 'manager']) OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Managers delete feeding_records" ON public.feeding_records;
CREATE POLICY "Managers delete feeding_records"
  ON public.feeding_records FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';

-- ========== Phase 11: Cow-calf feed context ==========

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS feeding_context TEXT NOT NULL DEFAULT 'general'
  CHECK (feeding_context IN ('general', 'cow_calf'));

CREATE INDEX IF NOT EXISTS feeding_records_context_idx
  ON public.feeding_records(organization_id, feeding_context);

NOTIFY pgrst, 'reload schema';

-- ========== Phase 12: Cow/heifer animal types ==========

ALTER TABLE public.individual_animals
  DROP CONSTRAINT IF EXISTS individual_animals_animal_type_check;

ALTER TABLE public.individual_animals
  ADD CONSTRAINT individual_animals_animal_type_check
  CHECK (animal_type IN ('bull', 'cow', 'heifer', 'other'));

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE13.sql ==========
-- LAORS Phase 13: Shared ranch calendar

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT NOT NULL DEFAULT 'general'
    CHECK (event_type IN ('general', 'feeding', 'health', 'breeding', 'calving', 'move', 'sale', 'other')),
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  color TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_org_idx ON public.calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS calendar_events_starts_idx ON public.calendar_events(organization_id, starts_at);

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read calendar_events" ON public.calendar_events;
CREATE POLICY "Members read calendar_events"
  ON public.calendar_events FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create calendar_events" ON public.calendar_events;
CREATE POLICY "Members create calendar_events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members update calendar or managers update" ON public.calendar_events;
CREATE POLICY "Members update calendar or managers update"
  ON public.calendar_events FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (public.has_org_role(organization_id, ARRAY['owner', 'manager']) OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Managers delete calendar_events" ON public.calendar_events;
CREATE POLICY "Managers delete calendar_events"
  ON public.calendar_events FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE14.sql ==========
-- LAORS Phase 14: Seedstock registry

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS registry_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (registry_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS sire_tag TEXT,
  ADD COLUMN IF NOT EXISTS dam_tag TEXT,
  ADD COLUMN IF NOT EXISTS pedigree TEXT,
  ADD COLUMN IF NOT EXISTS epd_birth_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_weaning_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_yearling_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_milk NUMERIC(6, 2);

ALTER TABLE public.individual_animals
  DROP CONSTRAINT IF EXISTS individual_animals_animal_type_check;

ALTER TABLE public.individual_animals
  ADD CONSTRAINT individual_animals_animal_type_check
  CHECK (animal_type IN ('bull', 'cow', 'heifer', 'steer', 'other'));

CREATE INDEX IF NOT EXISTS individual_animals_registry_idx
  ON public.individual_animals(organization_id, registry_context);

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE15.sql ==========
-- LAORS Phase 15: Seedstock breeding, extended EPDs, sales links

ALTER TABLE public.breeding_records
  ADD COLUMN IF NOT EXISTS breeding_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (breeding_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.breeding_records
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS embryo_donor_tag TEXT,
  ADD COLUMN IF NOT EXISTS embryo_recipient_tag TEXT;

CREATE INDEX IF NOT EXISTS breeding_records_context_idx
  ON public.breeding_records(organization_id, breeding_context);

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS epd_cea NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_doc NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_scrotal NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_marbling NUMERIC(6, 2);

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS individual_animal_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seedstock_sale_type TEXT
    CHECK (seedstock_sale_type IS NULL OR seedstock_sale_type IN ('live_animal', 'semen', 'embryo', 'other'));

CREATE INDEX IF NOT EXISTS sales_records_animal_idx
  ON public.sales_records(individual_animal_id)
  WHERE individual_animal_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ========== RUN_PHASE16.sql ==========
-- LAORS Phase 16: Maternal & reproductive intelligence

ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS calving_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (calving_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calf_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS breeding_record_id UUID REFERENCES public.breeding_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calving_ease_score INTEGER
    CHECK (calving_ease_score IS NULL OR (calving_ease_score >= 1 AND calving_ease_score <= 5)),
  ADD COLUMN IF NOT EXISTS assistance_type TEXT
    CHECK (
      assistance_type IS NULL OR assistance_type IN (
        'unassisted', 'easy_pull', 'hard_pull', 'c_section', 'unknown'
      )
    ),
  ADD COLUMN IF NOT EXISTS loss_cause TEXT
    CHECK (
      loss_cause IS NULL OR loss_cause IN (
        'calving_difficulty', 'disease', 'environmental', 'unknown'
      )
    );

CREATE INDEX IF NOT EXISTS calving_records_dam_idx
  ON public.calving_records(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calving_records_context_idx
  ON public.calving_records(organization_id, calving_context);

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sire_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS epd_calving_ease NUMERIC(6, 2);

CREATE INDEX IF NOT EXISTS individual_animals_dam_idx
  ON public.individual_animals(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.exposure_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  breeding_context TEXT NOT NULL DEFAULT 'seedstock'
    CHECK (breeding_context IN ('cow_calf', 'seedstock')),
  dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  dam_tag TEXT,
  bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  sire_tag TEXT,
  exposure_start DATE NOT NULL,
  exposure_end DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exposure_records_org_idx
  ON public.exposure_records(organization_id, exposure_start DESC);

DROP TRIGGER IF EXISTS exposure_records_updated_at ON public.exposure_records;
CREATE TRIGGER exposure_records_updated_at
  BEFORE UPDATE ON public.exposure_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.exposure_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exposure_records_org ON public.exposure_records;
CREATE POLICY exposure_records_org ON public.exposure_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE TABLE IF NOT EXISTS public.weaning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calving_record_id UUID REFERENCES public.calving_records(id) ON DELETE SET NULL,
  dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  calf_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  calf_tag TEXT,
  weaned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weaning_weight_lbs NUMERIC(8, 2)
    CHECK (weaning_weight_lbs IS NULL OR weaning_weight_lbs >= 0),
  retained_as_heifer BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weaning_records_org_idx
  ON public.weaning_records(organization_id, weaned_at DESC);

CREATE INDEX IF NOT EXISTS weaning_records_dam_idx
  ON public.weaning_records(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

DROP TRIGGER IF EXISTS weaning_records_updated_at ON public.weaning_records;
CREATE TRIGGER weaning_records_updated_at
  BEFORE UPDATE ON public.weaning_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.weaning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weaning_records_org ON public.weaning_records;
CREATE POLICY weaning_records_org ON public.weaning_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Phase 17: Feedstuff inventory + ration ingredients
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ton',
  quantity_on_hand NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_at NUMERIC(12, 4),
  price_per_unit NUMERIC(12, 4),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS feed_items_org_idx ON public.feed_items(organization_id);

DROP TRIGGER IF EXISTS feed_items_updated_at ON public.feed_items;
CREATE TRIGGER feed_items_updated_at
  BEFORE UPDATE ON public.feed_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feed_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  previous_quantity NUMERIC(12, 4) NOT NULL,
  new_quantity NUMERIC(12, 4) NOT NULL,
  delta NUMERIC(12, 4) NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (
    adjustment_type IN ('receive', 'use', 'adjust', 'feeding')
  ),
  feeding_record_id UUID REFERENCES public.feeding_records(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_stock_adj_item_idx
  ON public.feed_stock_adjustments(feed_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feed_ration_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_ration_id UUID NOT NULL REFERENCES public.feed_rations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE RESTRICT,
  quantity_per_ration_unit NUMERIC(12, 4) NOT NULL CHECK (quantity_per_ration_unit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_ration_id, feed_item_id)
);

CREATE INDEX IF NOT EXISTS feed_ration_ingredients_ration_idx
  ON public.feed_ration_ingredients(feed_ration_id);

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_ration_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_items" ON public.feed_items;
CREATE POLICY "Members read feed_items"
  ON public.feed_items FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_items" ON public.feed_items;
CREATE POLICY "Members write feed_items"
  ON public.feed_items FOR ALL
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read feed_stock_adjustments" ON public.feed_stock_adjustments;
CREATE POLICY "Members read feed_stock_adjustments"
  ON public.feed_stock_adjustments FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_stock_adjustments" ON public.feed_stock_adjustments;
CREATE POLICY "Members write feed_stock_adjustments"
  ON public.feed_stock_adjustments FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read feed_ration_ingredients" ON public.feed_ration_ingredients;
CREATE POLICY "Members read feed_ration_ingredients"
  ON public.feed_ration_ingredients FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Managers write feed_ration_ingredients" ON public.feed_ration_ingredients;
CREATE POLICY "Managers write feed_ration_ingredients"
  ON public.feed_ration_ingredients FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- =============================================================================
-- Phase 18: Lot-centric cattle groups + processing + mortality
-- =============================================================================

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS enterprise_type TEXT DEFAULT 'stocker'
    CHECK (enterprise_type IN ('stocker', 'cow_calf', 'breeding', 'raised_calves', 'custom_fed')),
  ADD COLUMN IF NOT EXISTS lot_status TEXT DEFAULT 'active'
    CHECK (lot_status IN ('receiving', 'active', 'hospital', 'ready_to_sell', 'partially_sold', 'closed')),
  ADD COLUMN IF NOT EXISTS opened_at DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS closed_at DATE,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS starting_head INTEGER,
  ADD COLUMN IF NOT EXISTS pay_weight_lbs NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS avg_weight_lbs NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS purchase_price_per_lb NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS landed_cost NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT;

CREATE INDEX IF NOT EXISTS cattle_groups_lot_number_idx
  ON public.cattle_groups(organization_id, lot_number);

CREATE TABLE IF NOT EXISTS public.processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  processed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  head_count INTEGER NOT NULL CHECK (head_count > 0),
  processing_type TEXT NOT NULL DEFAULT 'arrival'
    CHECK (processing_type IN (
      'arrival', 'revaccination', 'branding', 'implanting',
      'pregnancy_check', 'weaning', 'bull_work', 'other'
    )),
  chute_charge NUMERIC(12, 2) DEFAULT 0,
  labor_charge NUMERIC(12, 2) DEFAULT 0,
  processing_fee NUMERIC(12, 2) DEFAULT 0,
  medicine_cost NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS processing_events_group_idx
  ON public.processing_events(cattle_group_id, processed_at DESC);

DROP TRIGGER IF EXISTS processing_events_updated_at ON public.processing_events;
CREATE TRIGGER processing_events_updated_at
  BEFORE UPDATE ON public.processing_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.mortality_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  died_at DATE NOT NULL DEFAULT CURRENT_DATE,
  head_count INTEGER NOT NULL DEFAULT 1 CHECK (head_count > 0),
  cause TEXT,
  disposal_method TEXT,
  value_lost NUMERIC(12, 2),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mortality_records_group_idx
  ON public.mortality_records(cattle_group_id, died_at DESC);

DROP TRIGGER IF EXISTS mortality_records_updated_at ON public.mortality_records;
CREATE TRIGGER mortality_records_updated_at
  BEFORE UPDATE ON public.mortality_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read processing_events" ON public.processing_events;
CREATE POLICY "Members read processing_events"
  ON public.processing_events FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write processing_events" ON public.processing_events;
CREATE POLICY "Members write processing_events"
  ON public.processing_events FOR ALL
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members read mortality_records" ON public.mortality_records;
CREATE POLICY "Members read mortality_records"
  ON public.mortality_records FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write mortality_records" ON public.mortality_records;
CREATE POLICY "Members write mortality_records"
  ON public.mortality_records FOR ALL
  USING (public.is_org_member(organization_id));

-- =============================================================================
-- Phase 19: Feed purchases + % ration inclusion
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feed_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 4) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(14, 2) NOT NULL CHECK (total_cost >= 0),
  invoice_ref TEXT,
  notes TEXT,
  feed_stock_adjustment_id UUID REFERENCES public.feed_stock_adjustments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_purchases_item_idx
  ON public.feed_purchases(feed_item_id, purchased_at DESC);

DROP TRIGGER IF EXISTS feed_purchases_updated_at ON public.feed_purchases;
CREATE TRIGGER feed_purchases_updated_at
  BEFORE UPDATE ON public.feed_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feed_stock_adjustments
  ADD COLUMN IF NOT EXISTS feed_purchase_id UUID REFERENCES public.feed_purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4);

ALTER TABLE public.feed_ration_ingredients
  ADD COLUMN IF NOT EXISTS inclusion_percent NUMERIC(6, 3);

ALTER TABLE public.feed_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read feed_purchases" ON public.feed_purchases;
CREATE POLICY "Members read feed_purchases"
  ON public.feed_purchases FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write feed_purchases" ON public.feed_purchases;
CREATE POLICY "Members write feed_purchases"
  ON public.feed_purchases FOR ALL
  USING (public.is_org_member(organization_id));

-- =============================================================================
-- Phase 20: Lot expense ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lot_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  financial_category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lot_expenses_group_idx
  ON public.lot_expenses(cattle_group_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS lot_expenses_org_idx
  ON public.lot_expenses(organization_id, expense_date DESC);

DROP TRIGGER IF EXISTS lot_expenses_updated_at ON public.lot_expenses;
CREATE TRIGGER lot_expenses_updated_at
  BEFORE UPDATE ON public.lot_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lot_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read lot_expenses" ON public.lot_expenses;
CREATE POLICY "Members read lot_expenses"
  ON public.lot_expenses FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members write lot_expenses" ON public.lot_expenses;
CREATE POLICY "Members write lot_expenses"
  ON public.lot_expenses FOR ALL
  USING (public.is_org_member(organization_id));

-- =============================================================================
-- Phase 21: Feed cost snapshots
-- =============================================================================

ALTER TABLE public.feeding_records
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS total_feed_cost NUMERIC(14, 2);

ALTER TABLE public.feed_rations
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE;

NOTIFY pgrst, 'reload schema';

