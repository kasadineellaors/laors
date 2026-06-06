import { createClient } from "@/lib/supabase/server";
import { buildLocationTree, flattenTree } from "./tree";
import type { HeadCountByClassification, LocationRow } from "./types";

export async function getDirectHeadCountByLocation(
  orgId: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id, location_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .not("location_id", "is", null);

  if (!groups?.length) return new Map();

  const groupIds = groups.map((g) => g.id);
  const { data: counts } = await supabase
    .from("group_inventory_counts")
    .select("cattle_group_id, head_count")
    .in("cattle_group_id", groupIds);

  const headByGroup = new Map<string, number>();
  for (const row of counts ?? []) {
    headByGroup.set(
      row.cattle_group_id,
      (headByGroup.get(row.cattle_group_id) ?? 0) + row.head_count,
    );
  }

  const result = new Map<string, number>();
  for (const group of groups) {
    if (!group.location_id) continue;
    const head = headByGroup.get(group.id) ?? 0;
    result.set(group.location_id, (result.get(group.location_id) ?? 0) + head);
  }

  return result;
}

export async function getLocationTreeWithRollups(orgId: string) {
  const supabase = await createClient();

  const [{ data: locations }, { data: types }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("depth")
      .order("name"),
    supabase
      .from("location_types")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  const typeMap = new Map(
    (types ?? []).map((t) => [
      t.id,
      {
        id: t.id,
        name: t.name,
        plural_name: t.plural_name,
        tier: t.tier as "property" | "location",
      },
    ]),
  );
  const headCounts = await getDirectHeadCountByLocation(orgId);

  return buildLocationTree(
    (locations ?? []) as LocationRow[],
    typeMap,
    headCounts,
  );
}

export async function getNodeHeadCount(orgId: string, locationId: string): Promise<number> {
  const tree = await getLocationTreeWithRollups(orgId);
  const flat = flattenTree(tree);
  return flat.find((n) => n.id === locationId)?.head_count ?? 0;
}

export async function getNodeHeadCountByClassification(
  orgId: string,
  locationId: string,
): Promise<HeadCountByClassification[]> {
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, path")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const target = locations?.find((l) => l.id === locationId);
  if (!target?.path) return [];

  const subtreeIds = (locations ?? [])
    .filter((l) => l.path === target.path || l.path?.startsWith(`${target.path}.`))
    .map((l) => l.id);

  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("location_id", subtreeIds);

  if (!groups?.length) return [];

  const { data: counts } = await supabase
    .from("group_inventory_counts")
    .select("classification_id, head_count")
    .in(
      "cattle_group_id",
      groups.map((g) => g.id),
    );

  const classIds = [...new Set((counts ?? []).map((c) => c.classification_id))];
  const { data: classifications } = classIds.length
    ? await supabase
        .from("cattle_classifications")
        .select("id, name")
        .in("id", classIds)
    : { data: [] };

  const nameById = new Map((classifications ?? []).map((c) => [c.id, c.name]));

  const aggregated = new Map<string, HeadCountByClassification>();
  for (const row of counts ?? []) {
    const classId = row.classification_id;
    const className = nameById.get(classId) ?? "Unknown";
    const existing = aggregated.get(classId);
    if (existing) {
      existing.head_count += row.head_count;
    } else {
      aggregated.set(classId, {
        classification_id: classId,
        classification_name: className,
        head_count: row.head_count,
      });
    }
  }

  return Array.from(aggregated.values()).sort((a, b) =>
    a.classification_name.localeCompare(b.classification_name),
  );
}

export async function getRanchTotalHeadCount(orgId: string): Promise<number> {
  const tree = await getLocationTreeWithRollups(orgId);
  return tree.reduce((sum, node) => sum + node.head_count, 0);
}
