import { createClient } from "@/lib/supabase/server";
import type { CalvingAlertInput } from "./calving-alerts";

const DB_HINT = "Run supabase db push for Phase 37, then retry.";

export async function getCalvingAlertInput(orgId: string): Promise<CalvingAlertInput> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(`${today}T12:00:00`);
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  const [{ data: breedingRows }, { data: calvedDamIds }, unprocessed, calfWithoutCalving, multiDam] =
    await Promise.all([
      supabase
        .from("breeding_records")
        .select("dam_id, expected_calving_date, pregnancy_status")
        .eq("organization_id", orgId)
        .eq("breeding_context", "cow_calf")
        .eq("is_active", true)
        .not("pregnancy_status", "eq", "open"),
      supabase
        .from("calving_records")
        .select("dam_id")
        .eq("organization_id", orgId)
        .eq("calving_context", "cow_calf")
        .eq("is_active", true)
        .not("dam_id", "is", null),
      getUnprocessedCalfCount(orgId),
      countCalvesWithoutCalvingRecord(orgId),
      countCalvesWithMultipleActiveDams(orgId),
    ]);

  const calvedSet = new Set((calvedDamIds ?? []).map((r) => r.dam_id).filter(Boolean));

  let dueNext7Days = 0;
  let overdueNoCalving = 0;
  let bredWithoutDueDate = 0;

  for (const row of breedingRows ?? []) {
    const due = row.expected_calving_date as string | null;
    const damId = row.dam_id as string | null;
    if (!due) {
      if (row.pregnancy_status === "bred" || row.pregnancy_status === "confirmed") {
        bredWithoutDueDate += 1;
      }
      continue;
    }
    if (due >= today && due <= in7Str) dueNext7Days += 1;
    if (due < today && damId && !calvedSet.has(damId)) {
      overdueNoCalving += 1;
    }
  }

  return {
    dueNext7Days,
    overdueNoCalving,
    bredWithoutDueDate,
    unprocessedCalves: unprocessed,
    calfWithoutCalvingRecord: calfWithoutCalving,
    multiDamCalves: multiDam,
  };
}

export async function getUnprocessedCalfCount(orgId: string): Promise<number> {
  const supabase = await createClient();

  const { data: calves } = await supabase
    .from("individual_animals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("animal_type", "other")
    .eq("is_active", true)
    .eq("calf_lifecycle_status", "at_side");

  if (!calves?.length) return 0;

  const calfIds = calves.map((c) => c.id);

  const { data: processed, error } = await supabase
    .from("cow_calf_processing_lines")
    .select("calf_id, cow_calf_processing_events!inner(event_type)")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("calf_id", calfIds);

  if (error) {
    if (error.message.includes("cow_calf_processing")) return calfIds.length;
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  const birthProcessed = new Set<string>();
  for (const line of processed ?? []) {
    const event = line.cow_calf_processing_events as { event_type?: string } | null;
    if (event?.event_type === "birth_processing") {
      birthProcessed.add(line.calf_id as string);
    }
  }

  return calfIds.filter((id) => !birthProcessed.has(id)).length;
}

async function countCalvesWithoutCalvingRecord(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { data: calves } = await supabase
    .from("individual_animals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf")
    .eq("animal_type", "other")
    .eq("is_active", true);

  if (!calves?.length) return 0;

  const { data: calvingLinks } = await supabase
    .from("calving_records")
    .select("calf_id")
    .eq("organization_id", orgId)
    .eq("calving_context", "cow_calf")
    .eq("is_active", true)
    .not("calf_id", "is", null);

  const linked = new Set((calvingLinks ?? []).map((r) => r.calf_id));
  return calves.filter((c) => !linked.has(c.id)).length;
}

async function countCalvesWithMultipleActiveDams(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { data: rels } = await supabase
    .from("dam_calf_relationships")
    .select("calf_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .eq("nursing_status", "at_side");

  const counts = new Map<string, number>();
  for (const rel of rels ?? []) {
    const id = rel.calf_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.values()].filter((n) => n > 1).length;
}

export async function getProcessedCalfIds(orgId: string, eventType?: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_processing_lines")
    .select("calf_id, cow_calf_processing_events!inner(event_type)")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (error) {
    if (error.message.includes("cow_calf_processing")) return new Set();
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  const ids = new Set<string>();
  for (const line of data ?? []) {
    const event = line.cow_calf_processing_events as { event_type?: string } | null;
    if (!eventType || event?.event_type === eventType) {
      ids.add(line.calf_id as string);
    }
  }
  return ids;
}
