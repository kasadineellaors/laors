import { createClient } from "@/lib/supabase/server";
import type { CalvingRecord, CalvingSummary, BullRecord, CowRecord, CowSummary, ClassificationOption } from "./types";

const DB_HINT = "Run supabase/RUN_PHASE8.sql or supabase db push, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("calving_records") ||
    message.includes("individual_animals") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

type CalvingRow = {
  id: string;
  calved_at: string;
  calving_context?: string;
  location_id: string | null;
  cattle_group_id: string | null;
  cow_calf_herd_id?: string | null;
  dam_id?: string | null;
  dam_tag: string | null;
  bull_id?: string | null;
  sire_tag: string | null;
  calf_tag: string | null;
  calf_id?: string | null;
  calf_sex: string;
  birth_weight_lbs: number | null;
  outcome: string;
  calving_ease_score?: number | null;
  assistance_type?: string | null;
  loss_cause?: string | null;
  breeding_record_id?: string | null;
  classification_id: string | null;
  add_to_inventory: boolean;
  inventory_added: boolean;
  notes: string | null;
  calving_event_id?: string | null;
  twin_status?: string | null;
  fostered?: boolean;
};

async function enrichCalving(orgId: string, rows: CalvingRow[]): Promise<CalvingRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const herdIds = [...new Set(rows.map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];
  const classIds = [...new Set(rows.map((r) => r.classification_id).filter(Boolean))] as string[];

  const [{ data: groups }, { data: herds }, { data: locations }, { data: classes }] = await Promise.all([
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    herdIds.length
      ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    classIds.length
      ? supabase.from("cattle_classifications").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const classMap = new Map((classes ?? []).map((c) => [c.id, c.name]));

  return rows.map((row) => ({
    id: row.id,
    calved_at: row.calved_at,
    calving_context: (row.calving_context ?? "cow_calf") as CalvingRecord["calving_context"],
    location_id: row.location_id,
    location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
    cattle_group_id: row.cattle_group_id,
    cattle_group_name: row.cattle_group_id ? groupMap.get(row.cattle_group_id) ?? null : null,
    cow_calf_herd_id: row.cow_calf_herd_id ?? null,
    herd_name: row.cow_calf_herd_id ? herdMap.get(row.cow_calf_herd_id) ?? null : null,
    dam_id: row.dam_id ?? null,
    dam_tag: row.dam_tag,
    bull_id: row.bull_id ?? null,
    sire_tag: row.sire_tag,
    calf_tag: row.calf_tag,
    calf_id: row.calf_id ?? null,
    calf_sex: row.calf_sex as CalvingRecord["calf_sex"],
    birth_weight_lbs: row.birth_weight_lbs != null ? Number(row.birth_weight_lbs) : null,
    outcome: row.outcome as CalvingRecord["outcome"],
    calving_ease_score:
      row.calving_ease_score != null ? Number(row.calving_ease_score) : null,
    assistance_type: (row.assistance_type as CalvingRecord["assistance_type"]) ?? null,
    loss_cause: (row.loss_cause as CalvingRecord["loss_cause"]) ?? null,
    breeding_record_id: row.breeding_record_id ?? null,
    calving_event_id: row.calving_event_id ?? null,
    twin_status: (row.twin_status as CalvingRecord["twin_status"]) ?? null,
    fostered: row.fostered ?? false,
    classification_id: row.classification_id,
    classification_name: row.classification_id ? classMap.get(row.classification_id) ?? null : null,
    add_to_inventory: row.add_to_inventory,
    inventory_added: row.inventory_added,
    notes: row.notes,
  }));
}

export async function listCalvingByContext(
  orgId: string,
  context: CalvingRecord["calving_context"],
): Promise<CalvingRecord[]> {
  const all = await listCalvingRecords(orgId);
  return all.filter((r) => r.calving_context === context);
}

export async function listCalvingRecords(orgId: string): Promise<CalvingRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calving_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("calved_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(formatDbError(error.message));
  return enrichCalving(orgId, (data ?? []) as CalvingRow[]);
}

export async function getCalvingRecord(orgId: string, id: string): Promise<CalvingRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calving_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) return null;
  const [record] = await enrichCalving(orgId, [data as CalvingRow]);
  return record ?? null;
}

export async function getCalvingSummary(orgId: string): Promise<CalvingSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calving_records")
    .select("calved_at, outcome")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (error) throw new Error(formatDbError(error.message));

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const rows = data ?? [];
  return {
    total: rows.length,
    live: rows.filter((r) => r.outcome === "live").length,
    thisMonth: rows.filter((r) => r.calved_at >= monthStart).length,
  };
}

type BullRow = {
  id: string;
  tag_number: string;
  name: string | null;
  cattle_group_id: string | null;
  location_id: string | null;
  status: string;
  birth_date: string | null;
  notes: string | null;
};

async function enrichBulls(rows: BullRow[]): Promise<BullRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];

  const [{ data: groups }, { data: locations }] = await Promise.all([
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  return rows.map((row) => ({
    id: row.id,
    tag_number: row.tag_number,
    name: row.name,
    cattle_group_id: row.cattle_group_id,
    cattle_group_name: row.cattle_group_id ? groupMap.get(row.cattle_group_id) ?? null : null,
    location_id: row.location_id,
    location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
    status: row.status as BullRecord["status"],
    birth_date: row.birth_date,
    notes: row.notes,
  }));
}

export async function listBulls(orgId: string): Promise<BullRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("animal_type", "bull")
    .eq("registry_context", "cow_calf")
    .eq("is_active", true)
    .order("tag_number");

  if (error) throw new Error(formatDbError(error.message));
  return enrichBulls((data ?? []) as BullRow[]);
}

export async function getBull(orgId: string, id: string): Promise<BullRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) return null;
  const [bull] = await enrichBulls([data as BullRow]);
  return bull ?? null;
}

export async function listCalfClassifications(orgId: string): Promise<ClassificationOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cattle_classifications")
    .select("id, name, short_code")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    short_code: c.short_code,
  }));
}

type CowRow = BullRow & { animal_type: string };

async function enrichCows(rows: CowRow[]): Promise<CowRecord[]> {
  const bulls = await enrichBulls(rows);
  return bulls.map((b, i) => ({
    ...b,
    animal_type: (rows[i].animal_type === "heifer" ? "heifer" : "cow") as CowRecord["animal_type"],
  }));
}

export async function listCows(orgId: string): Promise<CowRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .in("animal_type", ["cow", "heifer"])
    .eq("registry_context", "cow_calf")
    .eq("is_active", true)
    .order("tag_number");

  if (error) throw new Error(formatDbError(error.message));
  return enrichCows((data ?? []) as CowRow[]);
}

export async function getCow(orgId: string, id: string): Promise<CowRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .in("animal_type", ["cow", "heifer"])
    .eq("registry_context", "cow_calf")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) return null;
  const [cow] = await enrichCows([data as CowRow]);
  return cow ?? null;
}

export async function getCowSummary(orgId: string): Promise<CowSummary> {
  const cows = await listCows(orgId);
  return {
    total: cows.length,
    active: cows.filter((c) => c.status === "active").length,
    cows: cows.filter((c) => c.animal_type === "cow").length,
    heifers: cows.filter((c) => c.animal_type === "heifer").length,
  };
}
