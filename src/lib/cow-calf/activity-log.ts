import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

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
