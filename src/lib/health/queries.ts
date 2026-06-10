import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { TreatmentRecord } from "./types";

export async function listTreatments(orgId: string, limit = 50): Promise<TreatmentRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("treatment_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("treatment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichTreatments(orgId, rows);
}

export async function getTreatment(orgId: string, id: string): Promise<TreatmentRecord | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("treatment_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;
  const [enriched] = await enrichTreatments(orgId, [row]);
  return enriched ?? null;
}

async function enrichTreatments(
  orgId: string,
  rows: Array<Record<string, unknown>>,
): Promise<TreatmentRecord[]> {
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set(
      rows.flatMap((r) => [r.administered_by, r.created_by].filter(Boolean)),
    ),
  ] as string[];

  const medicineIds = [...new Set(rows.map((r) => r.medicine_item_id).filter(Boolean))] as string[];

  const [{ data: groups }, { data: locations }, { data: profiles }, { data: medicines }] =
    await Promise.all([
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    medicineIds.length
      ? supabase.from("medicine_items").select("id, name").in("id", medicineIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const medicineNames = new Map((medicines ?? []).map((m) => [m.id, m.name]));
  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  const locRows = (locations ?? []) as LocationRow[];
  const allLocs =
    locRows.length > 0
      ? (
          await supabase
            .from("locations")
            .select("id, name, parent_id, depth, path")
            .eq("organization_id", orgId)
            .eq("is_active", true)
        ).data ?? []
      : [];
  const locLabels = new Map(
    locRows.map((l) => [
      l.id,
      getBreadcrumb(l.id, allLocs as LocationRow[])
        .map((x) => x.name)
        .join(" › "),
    ]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    product_name: r.product_name as string,
    treatment_type: (r.treatment_type as string | null) ?? null,
    reason: (r.reason as string | null) ?? null,
    head_count: (r.head_count as number | null) ?? null,
    treatment_date: r.treatment_date as string,
    notes: (r.notes as string | null) ?? null,
    cattle_group_id: (r.cattle_group_id as string | null) ?? null,
    cattle_group_name: r.cattle_group_id
      ? groupNames.get(r.cattle_group_id as string) ?? null
      : null,
    location_id: (r.location_id as string | null) ?? null,
    location_label: r.location_id ? locLabels.get(r.location_id as string) ?? null : null,
    administered_by: (r.administered_by as string | null) ?? null,
    administered_by_name: r.administered_by
      ? profileNames.get(r.administered_by as string) ?? null
      : null,
    created_by: (r.created_by as string | null) ?? null,
    created_by_name: r.created_by ? profileNames.get(r.created_by as string) ?? null : null,
    medicine_item_id: (r.medicine_item_id as string | null) ?? null,
    medicine_item_name: r.medicine_item_id
      ? medicineNames.get(r.medicine_item_id as string) ?? null
      : null,
    quantity_used: r.quantity_used != null ? Number(r.quantity_used) : null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}
