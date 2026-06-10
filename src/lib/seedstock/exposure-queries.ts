import { createClient } from "@/lib/supabase/server";
import type { ExposureRecord } from "./exposure-types";

const DB_HINT = "Run supabase/RUN_PHASE16.sql or supabase db push, then retry.";

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
  if (!data?.length) return [];

  const damIds = [...new Set(data.map((r) => r.dam_id).filter(Boolean))] as string[];
  const bullIds = [...new Set(data.map((r) => r.bull_id).filter(Boolean))] as string[];
  const locIds = [...new Set(data.map((r) => r.location_id).filter(Boolean))] as string[];

  const [{ data: dams }, { data: bulls }, { data: locs }] = await Promise.all([
    damIds.length
      ? supabase.from("individual_animals").select("id, tag_number, name").in("id", damIds)
      : Promise.resolve({ data: [] }),
    bullIds.length
      ? supabase.from("individual_animals").select("id, tag_number, name").in("id", bullIds)
      : Promise.resolve({ data: [] }),
    locIds.length
      ? supabase.from("locations").select("id, name").in("id", locIds)
      : Promise.resolve({ data: [] }),
  ]);

  const damMap = new Map((dams ?? []).map((d) => [d.id, d]));
  const bullMap = new Map((bulls ?? []).map((b) => [b.id, b]));
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));

  return data.map((r) => {
    const dam = r.dam_id ? damMap.get(r.dam_id) : null;
    const bull = r.bull_id ? bullMap.get(r.bull_id) : null;
    return {
      id: r.id as string,
      breeding_context: r.breeding_context as ExposureRecord["breeding_context"],
      dam_id: (r.dam_id as string | null) ?? null,
      dam_tag: (r.dam_tag as string | null) ?? dam?.tag_number ?? null,
      dam_name: dam?.name ?? null,
      bull_id: (r.bull_id as string | null) ?? null,
      sire_tag: (r.sire_tag as string | null) ?? null,
      bull_tag: bull?.tag_number ?? null,
      bull_name: bull?.name ?? null,
      exposure_start: r.exposure_start as string,
      exposure_end: (r.exposure_end as string | null) ?? null,
      location_id: (r.location_id as string | null) ?? null,
      location_name: r.location_id ? locMap.get(r.location_id) ?? null : null,
      notes: (r.notes as string | null) ?? null,
    };
  });
}
