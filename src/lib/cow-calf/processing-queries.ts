import { createClient } from "@/lib/supabase/server";
import type { ProcessingEvent, ProcessingSummary } from "./processing-types";
import { getUnprocessedCalfCount } from "./calving-alert-queries";

const DB_HINT = "Run supabase db push for Phase 37, then retry.";

export async function listProcessingEvents(orgId: string): Promise<ProcessingEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_processing_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("processed_at", { ascending: false });

  if (error) {
    if (error.message.includes("cow_calf_processing")) return [];
    throw new Error(`${error.message} — ${DB_HINT}`);
  }
  if (!data?.length) return [];

  const eventIds = data.map((e) => e.id);
  const herdIds = [...new Set(data.map((e) => e.cow_calf_herd_id).filter(Boolean))] as string[];
  const locIds = [...new Set(data.map((e) => e.location_id).filter(Boolean))] as string[];

  const [{ data: lines }, { data: herds }, { data: locs }] = await Promise.all([
    supabase
      .from("cow_calf_processing_lines")
      .select("processing_event_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("processing_event_id", eventIds),
    herdIds.length
      ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
      : Promise.resolve({ data: [] }),
    locIds.length
      ? supabase.from("locations").select("id, name").in("id", locIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lineCounts = new Map<string, number>();
  for (const line of lines ?? []) {
    const eid = line.processing_event_id as string;
    lineCounts.set(eid, (lineCounts.get(eid) ?? 0) + 1);
  }

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));

  return data.map((row) => ({
    id: row.id as string,
    event_type: row.event_type as ProcessingEvent["event_type"],
    processed_at: row.processed_at as string,
    cow_calf_herd_id: (row.cow_calf_herd_id as string | null) ?? null,
    herd_name: row.cow_calf_herd_id ? herdMap.get(row.cow_calf_herd_id) ?? null : null,
    location_id: (row.location_id as string | null) ?? null,
    location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
    product_name: (row.product_name as string | null) ?? null,
    head_count: row.head_count != null ? Number(row.head_count) : null,
    notes: (row.notes as string | null) ?? null,
    calf_count: lineCounts.get(row.id as string) ?? 0,
  }));
}

export async function getProcessingSummary(orgId: string): Promise<ProcessingSummary> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data, error }, unprocessedCalves] = await Promise.all([
    supabase
      .from("cow_calf_processing_events")
      .select("processed_at")
      .eq("organization_id", orgId)
      .eq("is_active", true),
    getUnprocessedCalfCount(orgId),
  ]);

  if (error && !error.message.includes("cow_calf_processing")) {
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  const rows = data ?? [];
  return {
    totalEvents: rows.length,
    unprocessedCalves,
    thisMonth: rows.filter((r) => (r.processed_at as string) >= monthStart).length,
  };
}

export async function listCalfOptionsForHerd(orgId: string, herdId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("individual_animals")
    .select("id, tag_number, name, cow_calf_herd_id, calf_lifecycle_status")
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
  }));
}
