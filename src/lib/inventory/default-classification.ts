import { createClient } from "@/lib/supabase/server";

export const DEFAULT_HEAD_CLASSIFICATION = {
  name: "General Herd",
  shortCode: "GH",
};

/** Ranch-wide bucket for simple head-count entry (UI shows total only). */
export async function getDefaultHeadClassificationId(orgId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cattle_classifications")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", DEFAULT_HEAD_CLASSIFICATION.name)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("cattle_classifications")
    .insert({
      organization_id: orgId,
      name: DEFAULT_HEAD_CLASSIFICATION.name,
      short_code: DEFAULT_HEAD_CLASSIFICATION.shortCode,
      sort_order: 999,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not create default head classification");
  }

  return created.id;
}

/** Drain head from existing rows (by classification sort order). */
export async function buildMoveLinesForTotal(
  orgId: string,
  groupId: string,
  headToMove: number,
): Promise<{ classification_id: string; head_count: number }[]> {
  if (headToMove <= 0) return [];

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("group_inventory_counts")
    .select("classification_id, head_count")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .gt("head_count", 0);

  if (!rows?.length) {
    throw new Error("No head available in this group");
  }

  const classIds = rows.map((r) => r.classification_id);
  const { data: classes } = await supabase
    .from("cattle_classifications")
    .select("id, sort_order")
    .in("id", classIds);

  const sortOrder = new Map((classes ?? []).map((c) => [c.id, c.sort_order]));

  const sorted = [...rows].sort(
    (a, b) => (sortOrder.get(a.classification_id) ?? 0) - (sortOrder.get(b.classification_id) ?? 0),
  );

  let remaining = headToMove;
  const lines: { classification_id: string; head_count: number }[] = [];

  for (const row of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(row.head_count, remaining);
    if (take > 0) {
      lines.push({ classification_id: row.classification_id, head_count: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    throw new Error(`Only ${headToMove - remaining} head available`);
  }

  return lines;
}
