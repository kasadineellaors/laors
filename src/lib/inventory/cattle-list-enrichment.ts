import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface CattleListEnrichment {
  treatmentCountByGroup: Map<string, number>;
  feedingsTodayByGroup: Map<string, number>;
  withdrawalActiveByGroup: Map<string, boolean>;
  headsSoldByGroup: Map<string, number>;
  deathsByGroup: Map<string, number>;
}

export async function fetchCattleListEnrichment(
  orgId: string,
  groupIds: string[],
  supabase: SupabaseClient<Database>,
): Promise<CattleListEnrichment> {
  const empty: CattleListEnrichment = {
    treatmentCountByGroup: new Map(),
    feedingsTodayByGroup: new Map(),
    withdrawalActiveByGroup: new Map(),
    headsSoldByGroup: new Map(),
    deathsByGroup: new Map(),
  };

  if (!groupIds.length) return empty;

  const today = new Date().toISOString().slice(0, 10);

  const [
    treatmentsResult,
    feedingsResult,
    withdrawalsResult,
    salesResult,
    deathsResult,
  ] = await Promise.all([
    supabase
      .from("treatment_records")
      .select("cattle_group_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("feeding_records")
      .select("cattle_group_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("fed_at", today)
      .in("cattle_group_id", groupIds),
    supabase
      .from("treatment_records")
      .select("cattle_group_id, withdrawal_until")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("withdrawal_until", today)
      .in("cattle_group_id", groupIds),
    supabase
      .from("sales_records")
      .select("cattle_group_id, head_count")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("mortality_records")
      .select("cattle_group_id, head_count")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
  ]);

  const treatmentCountByGroup = new Map<string, number>();
  for (const row of treatmentsResult.data ?? []) {
    if (!row.cattle_group_id) continue;
    treatmentCountByGroup.set(
      row.cattle_group_id,
      (treatmentCountByGroup.get(row.cattle_group_id) ?? 0) + 1,
    );
  }

  const feedingsTodayByGroup = new Map<string, number>();
  for (const row of feedingsResult.data ?? []) {
    if (!row.cattle_group_id) continue;
    feedingsTodayByGroup.set(
      row.cattle_group_id,
      (feedingsTodayByGroup.get(row.cattle_group_id) ?? 0) + 1,
    );
  }

  const withdrawalActiveByGroup = new Map<string, boolean>();
  if (!withdrawalsResult.error) {
    for (const row of withdrawalsResult.data ?? []) {
      if (!row.cattle_group_id) continue;
      withdrawalActiveByGroup.set(row.cattle_group_id, true);
    }
  }

  const headsSoldByGroup = new Map<string, number>();
  for (const row of salesResult.data ?? []) {
    if (!row.cattle_group_id) continue;
    headsSoldByGroup.set(
      row.cattle_group_id,
      (headsSoldByGroup.get(row.cattle_group_id) ?? 0) + (row.head_count ?? 0),
    );
  }

  const deathsByGroup = new Map<string, number>();
  for (const row of deathsResult.data ?? []) {
    if (!row.cattle_group_id) continue;
    deathsByGroup.set(
      row.cattle_group_id,
      (deathsByGroup.get(row.cattle_group_id) ?? 0) + (row.head_count ?? 0),
    );
  }

  return {
    treatmentCountByGroup,
    feedingsTodayByGroup,
    withdrawalActiveByGroup,
    headsSoldByGroup,
    deathsByGroup,
  };
}

export function computeHeadDiscrepancy(
  startingHead: number | null,
  totalHead: number,
  headsSold: number,
  deaths: number,
  lotStatus: string,
): boolean {
  if (lotStatus === "closed" || startingHead == null || startingHead <= 0) return false;
  const expectedRemaining = startingHead - headsSold - deaths;
  return expectedRemaining !== totalHead;
}
