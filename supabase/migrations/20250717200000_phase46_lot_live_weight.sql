-- Lot live-weight tracking: outweight on moves and average-weight deaths update current_avg_weight_lbs

CREATE OR REPLACE FUNCTION public._group_head_count(p_group_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(head_count), 0)::INT
  FROM public.group_inventory_counts
  WHERE cattle_group_id = p_group_id;
$$;

CREATE OR REPLACE FUNCTION public._effective_group_avg_weight(p_group_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_group public.cattle_groups%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.cattle_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_group.current_avg_weight_lbs IS NOT NULL AND v_group.current_avg_weight_lbs > 0 THEN
    RETURN v_group.current_avg_weight_lbs;
  END IF;
  IF v_group.avg_weight_lbs IS NOT NULL AND v_group.avg_weight_lbs > 0 THEN
    RETURN v_group.avg_weight_lbs;
  END IF;
  IF v_group.received_weight_lbs IS NOT NULL
     AND v_group.starting_head IS NOT NULL
     AND v_group.starting_head > 0 THEN
    RETURN v_group.received_weight_lbs / v_group.starting_head;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._set_group_current_avg(p_group_id UUID, p_avg NUMERIC)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.cattle_groups
  SET current_avg_weight_lbs = p_avg
  WHERE id = p_group_id;
$$;

CREATE OR REPLACE FUNCTION public._apply_lot_weight_removal(
  p_group_id UUID,
  p_head_before INT,
  p_head_removed INT,
  p_weight_removed NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg NUMERIC;
  v_head_after INT;
  v_new_avg NUMERIC;
BEGIN
  IF p_head_removed <= 0 OR p_weight_removed IS NULL OR p_weight_removed <= 0 THEN
    RETURN;
  END IF;

  v_avg := public._effective_group_avg_weight(p_group_id);
  IF v_avg IS NULL THEN
    RETURN;
  END IF;

  v_head_after := p_head_before - p_head_removed;
  IF v_head_after <= 0 THEN
    PERFORM public._set_group_current_avg(p_group_id, NULL);
    RETURN;
  END IF;

  v_new_avg := (v_avg * p_head_before - p_weight_removed) / v_head_after;
  IF v_new_avg > 0 THEN
    PERFORM public._set_group_current_avg(p_group_id, v_new_avg);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._apply_lot_weight_addition(
  p_group_id UUID,
  p_head_before INT,
  p_head_added INT,
  p_weight_added NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg NUMERIC;
  v_head_after INT;
  v_new_avg NUMERIC;
BEGIN
  IF p_head_added <= 0 OR p_weight_added IS NULL OR p_weight_added <= 0 THEN
    RETURN;
  END IF;

  v_head_after := p_head_before + p_head_added;
  IF v_head_after <= 0 THEN
    RETURN;
  END IF;

  v_avg := public._effective_group_avg_weight(p_group_id);
  IF v_avg IS NOT NULL AND p_head_before > 0 THEN
    v_new_avg := (v_avg * p_head_before + p_weight_added) / v_head_after;
  ELSE
    v_new_avg := p_weight_added / v_head_after;
  END IF;

  IF v_new_avg > 0 THEN
    PERFORM public._set_group_current_avg(p_group_id, v_new_avg);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._resolve_move_weight_lbs(
  p_head_moved INT,
  p_out_weight NUMERIC,
  p_source_group_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  IF p_out_weight IS NOT NULL AND p_out_weight > 0 THEN
    RETURN p_out_weight;
  END IF;

  v_avg := public._effective_group_avg_weight(p_source_group_id);
  IF v_avg IS NOT NULL AND p_head_moved > 0 THEN
    RETURN v_avg * p_head_moved;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._transfer_move_weight(
  p_source_group_id UUID,
  p_dest_group_id UUID,
  p_source_head_before INT,
  p_dest_head_before INT,
  p_head_moved INT,
  p_weight_moved NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_weight_moved IS NULL OR p_weight_moved <= 0 OR p_head_moved <= 0 THEN
    RETURN;
  END IF;

  PERFORM public._apply_lot_weight_removal(
    p_source_group_id, p_source_head_before, p_head_moved, p_weight_moved
  );
  PERFORM public._apply_lot_weight_addition(
    p_dest_group_id, p_dest_head_before, p_head_moved, p_weight_moved
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- execute_cattle_move — apply weight transfer after head move
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
  v_dest_head_before INT;
  v_moved_at TIMESTAMPTZ;
  v_out_weight NUMERIC(12, 2);
  v_weight_moved NUMERIC(12, 2);
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

  IF p_payload->>'out_weight_lbs' IS NOT NULL
     AND trim(p_payload->>'out_weight_lbs') <> '' THEN
    v_out_weight := (p_payload->>'out_weight_lbs')::NUMERIC;
    IF v_out_weight < 0 THEN
      RAISE EXCEPTION 'Outweight must be zero or greater';
    END IF;
  ELSE
    v_out_weight := NULL;
  END IF;

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

  v_dest_head_before := public._group_head_count(v_dest_group_id);
  v_weight_moved := public._resolve_move_weight_lbs(v_total, v_out_weight, v_source.id);

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_class_id := (v_line->>'classification_id')::UUID;
    v_head := (v_line->>'head_count')::INT;

    PERFORM public._upsert_group_count(v_org_id, v_source.id, v_class_id, -v_head);
    PERFORM public._upsert_group_count(v_org_id, v_dest_group_id, v_class_id, v_head);
  END LOOP;

  IF v_weight_moved IS NOT NULL THEN
    PERFORM public._transfer_move_weight(
      v_source.id,
      v_dest_group_id,
      v_source_total,
      v_dest_head_before,
      v_total,
      v_weight_moved
    );
    v_out_weight := v_weight_moved;
  END IF;

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
    out_weight_lbs,
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
    v_out_weight,
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
      'total_head', v_total,
      'out_weight_lbs', v_out_weight
    )
  );

  RETURN v_movement_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- void_cattle_move — reverse weight transfer
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
  v_weight_moved NUMERIC(12, 2);
  v_source_head INT;
  v_dest_head INT;
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

  v_weight_moved := public._resolve_move_weight_lbs(
    v_move.total_head,
    v_move.out_weight_lbs,
    v_move.source_group_id
  );

  v_source_head := public._group_head_count(v_move.source_group_id);
  v_dest_head := public._group_head_count(v_move.destination_group_id);

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

  IF v_weight_moved IS NOT NULL THEN
    PERFORM public._apply_lot_weight_addition(
      v_move.source_group_id,
      v_source_head,
      v_move.total_head,
      v_weight_moved
    );
    PERFORM public._apply_lot_weight_removal(
      v_move.destination_group_id,
      v_dest_head + v_move.total_head,
      v_move.total_head,
      v_weight_moved
    );
  END IF;

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

-- ---------------------------------------------------------------------------
-- update_cattle_move — reverse then re-apply weight with head changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_cattle_move(
  p_movement_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_move public.cattle_movements%ROWTYPE;
  v_old_line public.cattle_movement_lines%ROWTYPE;
  v_source public.cattle_groups%ROWTYPE;
  v_dest_group_id UUID;
  v_dest_group public.cattle_groups%ROWTYPE;
  v_line JSONB;
  v_class_id UUID;
  v_head INT;
  v_total INT := 0;
  v_source_total INT;
  v_dest_head_before INT;
  v_moved_at TIMESTAMPTZ;
  v_out_weight NUMERIC(12, 2);
  v_weight_moved NUMERIC(12, 2);
  v_old_weight NUMERIC(12, 2);
  v_old_source_head INT;
  v_old_dest_head INT;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_payload IS NULL OR p_payload->'lines' IS NULL THEN
    RAISE EXCEPTION 'Move lines are required';
  END IF;

  SELECT * INTO v_move
  FROM public.cattle_movements
  WHERE id = p_movement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement not found';
  END IF;

  IF v_move.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed moves can be edited';
  END IF;

  v_org_id := v_move.organization_id;

  IF NOT public.has_org_role(v_org_id, ARRAY['owner', 'manager']) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_old_weight := public._resolve_move_weight_lbs(
    v_move.total_head,
    v_move.out_weight_lbs,
    v_move.source_group_id
  );
  v_old_source_head := public._group_head_count(v_move.source_group_id);
  v_old_dest_head := public._group_head_count(v_move.destination_group_id);

  FOR v_old_line IN
    SELECT * FROM public.cattle_movement_lines WHERE movement_id = p_movement_id
  LOOP
    PERFORM public._upsert_group_count(
      v_org_id, v_move.source_group_id, v_old_line.classification_id, v_old_line.head_count
    );
    PERFORM public._upsert_group_count(
      v_org_id, v_move.destination_group_id, v_old_line.classification_id, -v_old_line.head_count
    );
  END LOOP;

  IF v_old_weight IS NOT NULL THEN
    PERFORM public._apply_lot_weight_addition(
      v_move.source_group_id,
      v_old_source_head,
      v_move.total_head,
      v_old_weight
    );
    PERFORM public._apply_lot_weight_removal(
      v_move.destination_group_id,
      v_old_dest_head + v_move.total_head,
      v_move.total_head,
      v_old_weight
    );
  END IF;

  SELECT * INTO v_source
  FROM public.cattle_groups
  WHERE id = v_move.source_group_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source group not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = (p_payload->>'destination_location_id')::UUID
      AND organization_id = v_org_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Destination location not found';
  END IF;

  v_moved_at := COALESCE((p_payload->>'moved_at')::TIMESTAMPTZ, v_move.moved_at);

  IF p_payload->>'out_weight_lbs' IS NOT NULL
     AND trim(p_payload->>'out_weight_lbs') <> '' THEN
    v_out_weight := (p_payload->>'out_weight_lbs')::NUMERIC;
    IF v_out_weight < 0 THEN
      RAISE EXCEPTION 'Outweight must be zero or greater';
    END IF;
  ELSE
    v_out_weight := NULL;
  END IF;

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

  IF v_total > v_source_total THEN
    RAISE EXCEPTION 'Not enough head at source lot (% available, % requested)', v_source_total, v_total;
  END IF;

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

  v_dest_head_before := public._group_head_count(v_dest_group_id);
  v_weight_moved := public._resolve_move_weight_lbs(v_total, v_out_weight, v_source.id);

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_class_id := (v_line->>'classification_id')::UUID;
    v_head := (v_line->>'head_count')::INT;

    PERFORM public._upsert_group_count(v_org_id, v_source.id, v_class_id, -v_head);
    PERFORM public._upsert_group_count(v_org_id, v_dest_group_id, v_class_id, v_head);
  END LOOP;

  IF v_weight_moved IS NOT NULL THEN
    PERFORM public._transfer_move_weight(
      v_source.id,
      v_dest_group_id,
      v_source_total,
      v_dest_head_before,
      v_total,
      v_weight_moved
    );
    v_out_weight := v_weight_moved;
  END IF;

  DELETE FROM public.cattle_movement_lines WHERE movement_id = p_movement_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    INSERT INTO public.cattle_movement_lines (
      organization_id, movement_id, classification_id, head_count
    ) VALUES (
      v_org_id,
      p_movement_id,
      (v_line->>'classification_id')::UUID,
      (v_line->>'head_count')::INT
    );
  END LOOP;

  UPDATE public.cattle_movements
  SET
    destination_group_id = v_dest_group_id,
    source_location_id = v_source.location_id,
    destination_location_id = (p_payload->>'destination_location_id')::UUID,
    movement_reason_id = NULLIF(p_payload->>'movement_reason_id', '')::UUID,
    total_head = v_total,
    is_partial = v_total < v_source_total,
    notes = NULLIF(trim(p_payload->>'notes'), ''),
    out_weight_lbs = v_out_weight,
    moved_at = v_moved_at
  WHERE id = p_movement_id;

  INSERT INTO public.audit_log (
    organization_id, user_id, action, table_name, record_id, new_data
  ) VALUES (
    v_org_id,
    v_user_id,
    'cattle.move_update',
    'cattle_movements',
    p_movement_id,
    jsonb_build_object(
      'source_group_id', v_source.id,
      'destination_group_id', v_dest_group_id,
      'total_head', v_total,
      'out_weight_lbs', v_out_weight
    )
  );

  RETURN p_movement_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
