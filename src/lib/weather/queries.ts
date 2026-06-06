import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import type { RainfallRecord, RainfallSummary } from "./types";

export async function listRainfall(orgId: string, limit = 50): Promise<RainfallRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("rainfall_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("recorded_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];
  return enrichRainfall(orgId, rows);
}

export async function getRainfall(orgId: string, id: string): Promise<RainfallRecord | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("rainfall_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;
  const [enriched] = await enrichRainfall(orgId, [row]);
  return enriched ?? null;
}

export async function getRainfallSummary(orgId: string): Promise<RainfallSummary> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("rainfall_records")
    .select("amount_inches")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .gte("recorded_date", sinceStr);

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.amount_inches), 0);
  return { totalLast30Days: Math.round(total * 100) / 100, recordCount: rows?.length ?? 0 };
}

async function enrichRainfall(
  orgId: string,
  rows: Array<Record<string, unknown>>,
): Promise<RainfallRecord[]> {
  const supabase = await createClient();

  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const profileIds = [...new Set(rows.map((r) => r.recorded_by).filter(Boolean))] as string[];

  const [{ data: locations }, { data: profiles }] = await Promise.all([
    locationIds.length
      ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

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
    recorded_date: r.recorded_date as string,
    amount_inches: Number(r.amount_inches),
    notes: (r.notes as string | null) ?? null,
    location_id: (r.location_id as string | null) ?? null,
    location_label: r.location_id ? locLabels.get(r.location_id as string) ?? null : null,
    recorded_by: (r.recorded_by as string | null) ?? null,
    recorded_by_name: r.recorded_by ? profileNames.get(r.recorded_by as string) ?? null : null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}
