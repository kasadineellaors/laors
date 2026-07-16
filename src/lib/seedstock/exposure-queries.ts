import { createClient } from "@/lib/supabase/server";
import type { ExposureRecord } from "./exposure-types";
import { exposureDurationDays, isActiveExposure } from "@/lib/cow-calf/reproduction-helpers";

const DB_HINT = "Run supabase/RUN_PHASE16.sql or supabase db push, then retry.";

type ExposureRow = {
  id: string;
  breeding_context: string;
  cow_calf_herd_id: string | null;
  exposed_cow_count: number | null;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  exposure_start: string;
  exposure_end: string | null;
  location_id: string | null;
  notes: string | null;
};

async function enrichExposure(rows: ExposureRow[]): Promise<ExposureRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const damIds = [...new Set(rows.map((r) => r.dam_id).filter(Boolean))] as string[];
  const bullIds = [...new Set(rows.map((r) => r.bull_id).filter(Boolean))] as string[];
  const locIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const herdIds = [...new Set(rows.map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];

  const [{ data: dams }, { data: bulls }, { data: locs }, { data: herds }] = await Promise.all([
    damIds.length
      ? supabase.from("individual_animals").select("id, tag_number, name").in("id", damIds)
      : Promise.resolve({ data: [] }),
    bullIds.length
      ? supabase.from("individual_animals").select("id, tag_number, name").in("id", bullIds)
      : Promise.resolve({ data: [] }),
    locIds.length
      ? supabase.from("locations").select("id, name").in("id", locIds)
      : Promise.resolve({ data: [] }),
    herdIds.length
      ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
      : Promise.resolve({ data: [] }),
  ]);

  const damMap = new Map((dams ?? []).map((d) => [d.id, d]));
  const bullMap = new Map((bulls ?? []).map((b) => [b.id, b]));
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));
  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));

  const today = new Date().toISOString().slice(0, 10);

  return rows.map((r) => {
    const dam = r.dam_id ? damMap.get(r.dam_id) : null;
    const bull = r.bull_id ? bullMap.get(r.bull_id) : null;
    return {
      id: r.id,
      breeding_context: r.breeding_context as ExposureRecord["breeding_context"],
      cow_calf_herd_id: r.cow_calf_herd_id,
      herd_name: r.cow_calf_herd_id ? herdMap.get(r.cow_calf_herd_id) ?? null : null,
      exposed_cow_count: r.exposed_cow_count,
      dam_id: r.dam_id,
      dam_tag: r.dam_tag ?? dam?.tag_number ?? null,
      dam_name: dam?.name ?? null,
      bull_id: r.bull_id,
      sire_tag: r.sire_tag,
      bull_tag: bull?.tag_number ?? null,
      bull_name: bull?.name ?? null,
      exposure_start: r.exposure_start,
      exposure_end: r.exposure_end,
      location_id: r.location_id,
      location_name: r.location_id ? locMap.get(r.location_id) ?? null : null,
      notes: r.notes,
      is_active: isActiveExposure(r.exposure_end, today),
      duration_days: exposureDurationDays(r.exposure_start, r.exposure_end, today),
    };
  });
}

export async function listExposureRecords(
  orgId: string,
  context: "seedstock" | "cow_calf" = "seedstock",
): Promise<ExposureRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exposure_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("breeding_context", context)
    .eq("is_active", true)
    .order("exposure_start", { ascending: false });

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return enrichExposure((data ?? []) as ExposureRow[]);
}

export async function getExposureRecord(
  orgId: string,
  id: string,
  context?: "seedstock" | "cow_calf",
): Promise<ExposureRecord | null> {
  const supabase = await createClient();
  let query = supabase
    .from("exposure_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true);

  if (context) query = query.eq("breeding_context", context);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (!data) return null;
  const [record] = await enrichExposure([data as ExposureRow]);
  return record ?? null;
}
