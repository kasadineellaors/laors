-- Run in Supabase SQL Editor: edit completed cattle moves (head, date, destination, notes)

-- Same as supabase/migrations/20250717190000_phase45_update_cattle_move.sql

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
  v_moved_at TIMESTAMPTZ;
  v_out_weight NUMERIC(12, 2);
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

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_class_id := (v_line->>'classification_id')::UUID;
    v_head := (v_line->>'head_count')::INT;

    PERFORM public._upsert_group_count(v_org_id, v_source.id, v_class_id, -v_head);
    PERFORM public._upsert_group_count(v_org_id, v_dest_group_id, v_class_id, v_head);
  END LOOP;

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

REVOKE ALL ON FUNCTION public.update_cattle_move(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_cattle_move(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
