import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { CattleGroupSummary, MovementRecord } from "./types";

export async function listCattleGroups(orgId: string): Promise<CattleGroupSummary[]> {
  const supabase = await createClient();

  const [{ data: groups }, { data: locations }, { data: counts }, { data: classifications }, { data: ownershipGroups }, { data: customers }] =
    await Promise.all([
      supabase
        .from("cattle_groups")
        .select("id, name, location_id, notes, ownership_group_id, customer_id")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("locations")
        .select("id, name, parent_id, depth, path")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("group_inventory_counts")
        .select("cattle_group_id, classification_id, head_count")
        .eq("organization_id", orgId),
      supabase
        .from("cattle_classifications")
        .select("id, name, short_code")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("ownership_groups")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true),
    ]);

  const ownershipNames = new Map((ownershipGroups ?? []).map((o) => [o.id, o.name]));
  const customerNames = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const locRows = (locations ?? []) as LocationRow[];
  const locName = new Map(locRows.map((l) => [l.id, l.name]));
  const classMap = new Map(
    (classifications ?? []).map((c) => [c.id, { name: c.name, short_code: c.short_code }]),
  );

  const countsByGroup = new Map<string, NonNullable<typeof counts>>();
  for (const row of counts ?? []) {
    const list = countsByGroup.get(row.cattle_group_id) ?? [];
    list.push(row);
    countsByGroup.set(row.cattle_group_id, list);
  }

  return (groups ?? []).map((g) => {
    const groupCounts = countsByGroup.get(g.id) ?? [];
    const lines = groupCounts.map((row) => {
      const cls = classMap.get(row.classification_id);
      return {
        classification_id: row.classification_id,
        classification_name: cls?.name ?? "Unknown",
        short_code: cls?.short_code ?? null,
        head_count: row.head_count,
      };
    });
    const total = lines.reduce((s, l) => s + l.head_count, 0);
    const breadcrumb = g.location_id
      ? getBreadcrumb(g.location_id, locRows)
          .map((l) => l.name)
          .join(" › ")
      : null;

    return {
      id: g.id,
      name: g.name,
      location_id: g.location_id,
      location_name: g.location_id ? locName.get(g.location_id) ?? null : null,
      location_breadcrumb: breadcrumb,
      total_head: total,
      counts: lines.sort((a, b) => a.classification_name.localeCompare(b.classification_name)),
      notes: g.notes,
      ownership_group_id: g.ownership_group_id,
      ownership_group_name: g.ownership_group_id
        ? ownershipNames.get(g.ownership_group_id) ?? null
        : null,
      customer_id: g.customer_id,
      customer_name: g.customer_id ? customerNames.get(g.customer_id) ?? null : null,
    };
  });
}

export async function getCattleGroup(
  orgId: string,
  groupId: string,
): Promise<CattleGroupSummary | null> {
  const groups = await listCattleGroups(orgId);
  return groups.find((g) => g.id === groupId) ?? null;
}

export async function listRecentMovements(
  orgId: string,
  limit = 25,
): Promise<MovementRecord[]> {
  const supabase = await createClient();

  const { data: movements, error } = await supabase
    .from("cattle_movements")
    .select("*")
    .eq("organization_id", orgId)
    .order("moved_at", { ascending: false })
    .limit(limit);

  if (error || !movements?.length) return [];

  const groupIds = [
    ...new Set(
      movements.flatMap((m) => [m.source_group_id, m.destination_group_id]),
    ),
  ];
  const locIds = [
    ...new Set(
      movements.flatMap((m) => [m.source_location_id, m.destination_location_id].filter(Boolean)),
    ),
  ] as string[];
  const reasonIds = [
    ...new Set(movements.map((m) => m.movement_reason_id).filter(Boolean)),
  ] as string[];

  const [{ data: groups }, { data: locations }, { data: reasons }, { data: lines }] =
    await Promise.all([
      supabase.from("cattle_groups").select("id, name").in("id", groupIds),
      locIds.length
        ? supabase.from("locations").select("id, name").in("id", locIds)
        : Promise.resolve({ data: [] }),
      reasonIds.length
        ? supabase.from("movement_reasons").select("id, name").in("id", reasonIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("cattle_movement_lines")
        .select("movement_id, classification_id, head_count")
        .in(
          "movement_id",
          movements.map((m) => m.id),
        ),
    ]);

  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const locNames = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const reasonNames = new Map((reasons ?? []).map((r) => [r.id, r.name]));

  const classIds = [...new Set((lines ?? []).map((l) => l.classification_id))];
  const { data: classifications } = classIds.length
    ? await supabase.from("cattle_classifications").select("id, name").in("id", classIds)
    : { data: [] };
  const classNames = new Map((classifications ?? []).map((c) => [c.id, c.name]));

  const linesByMove = new Map<string, MovementRecord["lines"]>();
  for (const line of lines ?? []) {
    const list = linesByMove.get(line.movement_id) ?? [];
    list.push({
      classification_id: line.classification_id,
      classification_name: classNames.get(line.classification_id) ?? "Unknown",
      head_count: line.head_count,
    });
    linesByMove.set(line.movement_id, list);
  }

  return movements.map((m) => ({
    id: m.id,
    moved_at: m.moved_at,
    status: m.status as "completed" | "voided",
    total_head: m.total_head,
    is_partial: m.is_partial,
    notes: m.notes,
    source_group_name: groupNames.get(m.source_group_id) ?? "Unknown",
    destination_group_name: groupNames.get(m.destination_group_id) ?? "Unknown",
    source_location_name: m.source_location_id
      ? locNames.get(m.source_location_id) ?? null
      : null,
    destination_location_name: locNames.get(m.destination_location_id) ?? null,
    reason_name: m.movement_reason_id
      ? reasonNames.get(m.movement_reason_id) ?? null
      : null,
    movement_reason_id: m.movement_reason_id,
    lines: linesByMove.get(m.id) ?? [],
  }));
}

export async function listGroupsAtLocation(
  orgId: string,
  locationId: string,
): Promise<{ id: string; name: string; total_head: number }[]> {
  const groups = await listCattleGroups(orgId);
  return groups
    .filter((g) => g.location_id === locationId)
    .map((g) => ({ id: g.id, name: g.name, total_head: g.total_head }));
}
