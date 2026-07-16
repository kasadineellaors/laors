import { createClient } from "@/lib/supabase/server";
import type {
  CowCalfSaleRecord,
  CowCalfSalesSummary,
  LossRecord,
  WeaningRecord,
} from "./exit-types";

const DB_HINT = "Run supabase db push for Phase 38, then retry.";

export async function listCowCalfWeaningRecords(orgId: string): Promise<WeaningRecord[]> {
  const supabase = await createClient();

  const { data: cowCalfCalves } = await supabase
    .from("individual_animals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf");

  const calfIdSet = new Set((cowCalfCalves ?? []).map((c) => c.id));

  const { data, error } = await supabase
    .from("weaning_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .not("calf_id", "is", null)
    .order("weaned_at", { ascending: false });

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);

  const rows = (data ?? []).filter(
    (r) => calfIdSet.has(r.calf_id as string) || r.cow_calf_herd_id,
  );

  return enrichWeaning(rows);
}

async function enrichWeaning(rows: Array<Record<string, unknown>>): Promise<WeaningRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const herdIds = new Set<string>();
  const damIds = new Set<string>();
  for (const r of rows) {
    if (r.cow_calf_herd_id) herdIds.add(r.cow_calf_herd_id as string);
    if (r.destination_herd_id) herdIds.add(r.destination_herd_id as string);
    if (r.dam_id) damIds.add(r.dam_id as string);
  }

  const [{ data: herds }, { data: dams }] = await Promise.all([
    herdIds.size
      ? supabase.from("cow_calf_herds").select("id, name").in("id", [...herdIds])
      : Promise.resolve({ data: [] }),
    damIds.size
      ? supabase.from("individual_animals").select("id, tag_number").in("id", [...damIds])
      : Promise.resolve({ data: [] }),
  ]);

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const damMap = new Map((dams ?? []).map((d) => [d.id, d.tag_number]));

  return rows.map((r) => ({
    id: r.id as string,
    weaned_at: r.weaned_at as string,
    calf_id: (r.calf_id as string | null) ?? null,
    calf_tag: (r.calf_tag as string | null) ?? null,
    dam_id: (r.dam_id as string | null) ?? null,
    dam_tag: r.dam_id ? damMap.get(r.dam_id as string) ?? null : null,
    weaning_weight_lbs: r.weaning_weight_lbs != null ? Number(r.weaning_weight_lbs) : null,
    weaning_method: (r.weaning_method as WeaningRecord["weaning_method"]) ?? null,
    cow_calf_herd_id: (r.cow_calf_herd_id as string | null) ?? null,
    herd_name: r.cow_calf_herd_id ? herdMap.get(r.cow_calf_herd_id as string) ?? null : null,
    destination_herd_id: (r.destination_herd_id as string | null) ?? null,
    destination_herd_name: r.destination_herd_id
      ? herdMap.get(r.destination_herd_id as string) ?? null
      : null,
    retained_as_heifer: Boolean(r.retained_as_heifer),
    notes: (r.notes as string | null) ?? null,
  }));
}

export async function getWeaningSummary(orgId: string) {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: weanings }, { count: readyCount }] = await Promise.all([
    supabase
      .from("weaning_records")
      .select("weaned_at")
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("individual_animals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("registry_context", "cow_calf")
      .eq("animal_type", "other")
      .eq("is_active", true)
      .eq("calf_lifecycle_status", "at_side"),
  ]);

  const rows = weanings ?? [];
  return {
    total: rows.length,
    thisMonth: rows.filter((r) => (r.weaned_at as string) >= monthStart).length,
    calvesReadyToWean: readyCount ?? 0,
  };
}

export async function listCalvesReadyToWean(orgId: string, herdId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("individual_animals")
    .select("id, tag_number, name, dam_id, cow_calf_herd_id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("animal_type", "other")
    .eq("is_active", true)
    .eq("calf_lifecycle_status", "at_side")
    .order("tag_number");

  if (herdId) query = query.eq("cow_calf_herd_id", herdId);

  const { data } = await query;
  return (data ?? []).map((c) => ({
    value: c.id,
    label: c.name ? `${c.tag_number} — ${c.name}` : c.tag_number,
    damId: c.dam_id,
    herdId: c.cow_calf_herd_id,
  }));
}

export async function listCowCalfSales(orgId: string): Promise<CowCalfSaleRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("sale_context", "cow_calf")
    .eq("is_active", true)
    .order("sale_date", { ascending: false });

  if (error) {
    if (error.message.includes("sale_context")) return [];
    throw new Error(`${error.message} — ${DB_HINT}`);
  }
  if (!data?.length) return [];

  const herdIds = [...new Set(data.map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];
  const { data: herds } = herdIds.length
    ? await supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
    : { data: [] };

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));

  return data.map((r) => ({
    id: r.id as string,
    sale_date: r.sale_date as string,
    buyer_name: (r.buyer_name as string | null) ?? null,
    head_count: r.head_count as number,
    total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    fees: r.fees != null ? Number(r.fees) : null,
    net_amount: r.net_amount != null ? Number(r.net_amount) : null,
    cow_calf_sale_type: (r.cow_calf_sale_type as CowCalfSaleRecord["cow_calf_sale_type"]) ?? null,
    cow_calf_herd_id: (r.cow_calf_herd_id as string | null) ?? null,
    herd_name: r.cow_calf_herd_id ? herdMap.get(r.cow_calf_herd_id as string) ?? null : null,
    animal_ids: (r.animal_ids as string[] | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  }));
}

export async function getCowCalfSalesSummary(orgId: string): Promise<CowCalfSalesSummary> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("sales_records")
    .select("head_count, total_amount, sale_date")
    .eq("organization_id", orgId)
    .eq("sale_context", "cow_calf")
    .eq("is_active", true);

  if (error && !error.message.includes("sale_context")) {
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  const rows = data ?? [];
  const recent = rows.filter((r) => (r.sale_date as string) >= sinceStr);
  return {
    totalSales: rows.length,
    headSoldLast30Days: recent.reduce((s, r) => s + (r.head_count as number), 0),
    revenueLast30Days:
      Math.round(recent.reduce((s, r) => s + Number(r.total_amount ?? 0), 0) * 100) / 100,
  };
}

export async function listCowCalfLosses(orgId: string): Promise<LossRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_loss_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("loss_date", { ascending: false });

  if (error) {
    if (error.message.includes("cow_calf_loss")) return [];
    throw new Error(`${error.message} — ${DB_HINT}`);
  }
  if (!data?.length) return [];

  const animalIds = [...new Set(data.map((r) => r.individual_animal_id))];
  const herdIds = [...new Set(data.map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];
  const locIds = [...new Set(data.map((r) => r.location_id).filter(Boolean))] as string[];

  const [{ data: animals }, { data: herds }, { data: locs }] = await Promise.all([
    supabase.from("individual_animals").select("id, tag_number, name").in("id", animalIds),
    herdIds.length
      ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
      : Promise.resolve({ data: [] }),
    locIds.length
      ? supabase.from("locations").select("id, name").in("id", locIds)
      : Promise.resolve({ data: [] }),
  ]);

  const animalMap = new Map((animals ?? []).map((a) => [a.id, a]));
  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));

  return data.map((r) => {
    const animal = animalMap.get(r.individual_animal_id as string);
    return {
      id: r.id as string,
      loss_date: r.loss_date as string,
      individual_animal_id: r.individual_animal_id as string,
      animal_tag: animal?.tag_number ?? null,
      animal_name: animal?.name ?? null,
      cause: r.cause as LossRecord["cause"],
      herd_name: r.cow_calf_herd_id ? herdMap.get(r.cow_calf_herd_id as string) ?? null : null,
      location_name: r.location_id ? locMap.get(r.location_id as string) ?? null : null,
      disposal_method: (r.disposal_method as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    };
  });
}

export async function listCowCalfAnimalOptions(orgId: string, types?: string[]) {
  const supabase = await createClient();
  let query = supabase
    .from("individual_animals")
    .select("id, tag_number, name, animal_type, cow_calf_herd_id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("is_active", true)
    .eq("status", "active")
    .order("tag_number");

  if (types?.length) query = query.in("animal_type", types);

  const { data } = await query;
  return (data ?? []).map((a) => ({
    value: a.id,
    label: a.name ? `${a.tag_number} — ${a.name}` : a.tag_number,
    animalType: a.animal_type,
    herdId: a.cow_calf_herd_id,
  }));
}
