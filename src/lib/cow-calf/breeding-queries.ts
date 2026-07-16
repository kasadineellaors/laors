import { createClient } from "@/lib/supabase/server";
import { listCowCalfHerds } from "./herd-queries";
import type { BreedingContext, BreedingRecord, BreedingSummary } from "./breeding-types";
import {
  daysBetween,
  findOverlappingBullExposures,
  isActiveExposure,
  pregnancyRateFromResults,
} from "./reproduction-helpers";

const DB_HINT = "Run supabase/RUN_PHASE9.sql or supabase db push, then retry.";

type BreedingRow = {
  id: string;
  bred_at: string;
  breeding_context?: string;
  cattle_group_id: string | null;
  cow_calf_herd_id: string | null;
  location_id: string | null;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  embryo_donor_tag: string | null;
  embryo_recipient_tag: string | null;
  breeding_method: string;
  expected_calving_date: string | null;
  pregnancy_status: string;
  pregnancy_check_date: string | null;
  notes: string | null;
};

async function enrichBreeding(rows: BreedingRow[]): Promise<BreedingRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const herdIds = [...new Set(rows.map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const bullIds = [...new Set(rows.map((r) => r.bull_id).filter(Boolean))] as string[];
  const damIds = [...new Set(rows.map((r) => r.dam_id).filter(Boolean))] as string[];

  const [{ data: groups }, { data: herds }, { data: locations }, { data: bulls }, { data: dams }] =
    await Promise.all([
      groupIds.length
        ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] }),
      herdIds.length
        ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
        : Promise.resolve({ data: [] }),
      locationIds.length
        ? supabase.from("locations").select("id, name").in("id", locationIds)
        : Promise.resolve({ data: [] }),
      bullIds.length
        ? supabase.from("individual_animals").select("id, tag_number, name").in("id", bullIds)
        : Promise.resolve({ data: [] }),
      damIds.length
        ? supabase.from("individual_animals").select("id, tag_number, name").in("id", damIds)
        : Promise.resolve({ data: [] }),
    ]);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const bullMap = new Map((bulls ?? []).map((b) => [b.id, b]));
  const damMap = new Map((dams ?? []).map((d) => [d.id, d]));

  return rows.map((row) => {
    const bull = row.bull_id ? bullMap.get(row.bull_id) : null;
    const dam = row.dam_id ? damMap.get(row.dam_id) : null;
    return {
      id: row.id,
      bred_at: row.bred_at,
      breeding_context: (row.breeding_context ?? "cow_calf") as BreedingContext,
      cattle_group_id: row.cattle_group_id,
      cattle_group_name: row.cattle_group_id ? groupMap.get(row.cattle_group_id) ?? null : null,
      cow_calf_herd_id: row.cow_calf_herd_id,
      herd_name: row.cow_calf_herd_id ? herdMap.get(row.cow_calf_herd_id) ?? null : null,
      location_id: row.location_id,
      location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
      dam_id: row.dam_id,
      dam_tag: row.dam_tag ?? dam?.tag_number ?? null,
      dam_name: dam?.name ?? null,
      bull_id: row.bull_id,
      bull_tag: bull?.tag_number ?? null,
      bull_name: bull?.name ?? null,
      sire_tag: row.sire_tag ?? bull?.tag_number ?? null,
      embryo_donor_tag: row.embryo_donor_tag,
      embryo_recipient_tag: row.embryo_recipient_tag,
      breeding_method: row.breeding_method as BreedingRecord["breeding_method"],
      expected_calving_date: row.expected_calving_date,
      pregnancy_status: row.pregnancy_status as BreedingRecord["pregnancy_status"],
      pregnancy_check_date: row.pregnancy_check_date,
      notes: row.notes,
    };
  });
}

export async function listBreedingRecords(
  orgId: string,
  context: BreedingContext = "cow_calf",
): Promise<BreedingRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breeding_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("breeding_context", context)
    .eq("is_active", true)
    .order("bred_at", { ascending: false });

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return enrichBreeding((data ?? []) as BreedingRow[]);
}

export async function listDueSoonBreedingRecords(
  orgId: string,
  withinDays = 30,
  context: BreedingContext = "cow_calf",
): Promise<BreedingRecord[]> {
  const records = await listBreedingRecords(orgId, context);
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + withinDays);
  const endStr = end.toISOString().slice(0, 10);

  return records.filter(
    (r) =>
      r.expected_calving_date &&
      r.expected_calving_date >= today &&
      r.expected_calving_date <= endStr &&
      r.pregnancy_status !== "open",
  );
}

export async function getBreedingRecord(
  orgId: string,
  id: string,
  context?: BreedingContext,
): Promise<BreedingRecord | null> {
  const supabase = await createClient();
  let query = supabase
    .from("breeding_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true);

  if (context) query = query.eq("breeding_context", context);

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (!data) return null;
  const [record] = await enrichBreeding([data as BreedingRow]);
  return record ?? null;
}

export async function getBreedingSummary(
  orgId: string,
  context: BreedingContext = "cow_calf",
): Promise<BreedingSummary> {
  const supabase = await createClient();
  const [{ data, error }, { data: exposures, error: expError }] = await Promise.all([
    supabase
      .from("breeding_records")
      .select("pregnancy_status, expected_calving_date, pregnancy_check_date, bred_at")
      .eq("organization_id", orgId)
      .eq("breeding_context", context)
      .eq("is_active", true),
    supabase
      .from("exposure_records")
      .select("exposure_start, exposure_end")
      .eq("organization_id", orgId)
      .eq("breeding_context", context)
      .eq("is_active", true),
  ]);

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (expError) throw new Error(`${expError.message} — ${DB_HINT}`);

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(`${today}T12:00:00`);
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);
  const in14 = new Date(`${today}T12:00:00`);
  in14.setDate(in14.getDate() + 14);
  const in14Str = in14.toISOString().slice(0, 10);

  const rows = data ?? [];
  const dueFilter = (end: string) =>
    rows.filter(
      (r) =>
        r.expected_calving_date &&
        r.expected_calving_date >= today &&
        r.expected_calving_date <= end &&
        r.pregnancy_status !== "open",
    ).length;

  const activeExposureRows = (exposures ?? []).filter((e) =>
    isActiveExposure(e.exposure_end as string | null, today),
  );

  return {
    activeBred: rows.filter((r) => r.pregnancy_status === "bred").length,
    confirmed: rows.filter((r) => r.pregnancy_status === "confirmed").length,
    open: rows.filter((r) => r.pregnancy_status === "open").length,
    recheck: rows.filter((r) => r.pregnancy_status === "recheck").length,
    dueNext14Days: dueFilter(in14Str),
    dueNext30Days: dueFilter(in30Str),
    activeExposures: activeExposureRows.length,
    overduePulls: activeExposureRows.filter(
      (e) => daysBetween(e.exposure_start as string, today) > 90,
    ).length,
  };
}

export async function getPregnancyRateSummary(orgId: string, context: BreedingContext = "cow_calf") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breeding_records")
    .select("pregnancy_status")
    .eq("organization_id", orgId)
    .eq("breeding_context", context)
    .eq("is_active", true)
    .not("pregnancy_check_date", "is", null);

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);

  const counts = { bred: 0, open: 0, recheck: 0, unknown: 0 };
  for (const row of data ?? []) {
    const status = row.pregnancy_status as string;
    if (status === "bred" || status === "confirmed") counts.bred += 1;
    else if (status === "open") counts.open += 1;
    else if (status === "recheck") counts.recheck += 1;
    else if (status === "unknown") counts.unknown += 1;
  }

  return pregnancyRateFromResults(counts);
}

export async function listActiveBullOptions(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("individual_animals")
    .select("id, tag_number, name")
    .eq("organization_id", orgId)
    .eq("animal_type", "bull")
    .eq("registry_context", "cow_calf")
    .eq("status", "active")
    .eq("is_active", true)
    .order("tag_number");

  return (data ?? []).map((b) => ({
    value: b.id,
    label: b.name ? `${b.tag_number} — ${b.name}` : b.tag_number,
    tag: b.tag_number,
  }));
}

export async function listCowCalfDamOptions(orgId: string, herdId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("individual_animals")
    .select("id, tag_number, name, ear_tag, ranch_id_number")
    .eq("organization_id", orgId)
    .eq("animal_type", "cow")
    .eq("registry_context", "cow_calf")
    .eq("status", "active")
    .eq("is_active", true)
    .order("tag_number");

  if (herdId) query = query.eq("cow_calf_herd_id", herdId);

  const { data } = await query;

  return (data ?? []).map((d) => {
    const idLabel = d.ear_tag || d.ranch_id_number || d.tag_number;
    return {
      value: d.id,
      label: d.name ? `${idLabel} — ${d.name}` : idLabel,
      tag: d.tag_number,
    };
  });
}

export async function listCowCalfHerdOptions(orgId: string) {
  const herds = await listCowCalfHerds(orgId);
  return herds
    .filter((h) => h.status === "active")
    .map((h) => ({ value: h.id, label: h.name }));
}

export async function listBreedingForAnimal(orgId: string, animalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breeding_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .or(`dam_id.eq.${animalId},bull_id.eq.${animalId}`)
    .order("bred_at", { ascending: false });

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  return enrichBreeding((data ?? []) as BreedingRow[]);
}

export async function listActiveBullExposureWindows(orgId: string, context: BreedingContext = "cow_calf") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exposure_records")
    .select("id, bull_id, dam_id, exposure_start, exposure_end")
    .eq("organization_id", orgId)
    .eq("breeding_context", context)
    .eq("is_active", true);

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);

  const today = new Date().toISOString().slice(0, 10);
  return (data ?? [])
    .filter((e) => isActiveExposure(e.exposure_end as string | null, today))
    .map((e) => ({
      id: e.id as string,
      bullId: (e.bull_id as string | null) ?? null,
      damId: (e.dam_id as string | null) ?? null,
      exposureStart: e.exposure_start as string,
      exposureEnd: (e.exposure_end as string | null) ?? null,
    }));
}

export { findOverlappingBullExposures };
