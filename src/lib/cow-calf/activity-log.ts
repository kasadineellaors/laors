import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface CowCalfActivityLogEntry {
  id: string;
  created_at: string;
  action: string;
  summary: string;
  herd_id: string | null;
  herd_name: string | null;
  animal_id: string | null;
  source_table: string | null;
  source_id: string | null;
}

export async function listCowCalfActivityLog(
  orgId: string,
  limit = 2000,
): Promise<CowCalfActivityLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_activity_log")
    .select("id, created_at, action, summary, herd_id, animal_id, source_table, source_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const herdIds = [...new Set(data.map((r) => r.herd_id).filter(Boolean))] as string[];
  const { data: herds } = herdIds.length
    ? await supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
    : { data: [] };

  const herdMap = new Map((herds ?? []).map((h) => [h.id, h.name]));

  return data.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    action: r.action,
    summary: r.summary,
    herd_id: r.herd_id,
    herd_name: r.herd_id ? herdMap.get(r.herd_id) ?? null : null,
    animal_id: r.animal_id,
    source_table: r.source_table,
    source_id: r.source_id,
  }));
}

export async function logCowCalfActivity(input: {
  organizationId: string;
  action: string;
  summary: string;
  herdId?: string | null;
  animalId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  details?: Record<string, unknown>;
  userId?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("cow_calf_activity_log").insert({
    organization_id: input.organizationId,
    action: input.action,
    summary: input.summary,
    herd_id: input.herdId ?? null,
    animal_id: input.animalId ?? null,
    source_table: input.sourceTable ?? null,
    source_id: input.sourceId ?? null,
    details: (input.details ?? null) as Json | null,
    created_by: input.userId ?? null,
  });

  if (error) {
    console.error("cow_calf_activity_log:", error.message);
  }
}
