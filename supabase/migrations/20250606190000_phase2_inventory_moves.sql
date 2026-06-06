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
