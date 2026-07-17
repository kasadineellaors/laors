import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

export function formatGenericCalfTag(sequence: number): string {
  return `Calf ${sequence}`;
}

/** Reserve the next unused generic calf tags for an org (handles twins). */
export async function reserveGenericCalfTags(
  supabase: ServerClient,
  orgId: string,
  count: number,
): Promise<string[]> {
  if (count < 1) return [];

  const { data: existing } = await supabase
    .from("individual_animals")
    .select("tag_number")
    .eq("organization_id", orgId)
    .eq("registry_context", "cow_calf");

  const used = new Set(
    (existing ?? [])
      .map((row) => row.tag_number?.trim().toLowerCase())
      .filter((tag): tag is string => Boolean(tag)),
  );

  const tags: string[] = [];
  let sequence = 1;
  while (tags.length < count) {
    const candidate = formatGenericCalfTag(sequence);
    if (!used.has(candidate.toLowerCase())) {
      tags.push(candidate);
      used.add(candidate.toLowerCase());
    }
    sequence += 1;
  }

  return tags;
}
