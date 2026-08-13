import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  avgAfterWeightAddition,
  avgAfterWeightRemoval,
  getEffectiveAvgWeightLbs,
  impliedWeightForHead,
} from "@/lib/inventory/lot-weight";

type Supabase = SupabaseClient<Database>;

const groupWeightSelect =
  "current_avg_weight_lbs, avg_weight_lbs, received_weight_lbs, starting_head" as const;

async function lotHeadCount(supabase: Supabase, groupId: string): Promise<number> {
  const { data } = await supabase
    .from("group_inventory_counts")
    .select("head_count")
    .eq("cattle_group_id", groupId);
  return (data ?? []).reduce((sum, row) => sum + row.head_count, 0);
}

async function loadGroupWeightRow(supabase: Supabase, groupId: string) {
  const { data } = await supabase
    .from("cattle_groups")
    .select(groupWeightSelect)
    .eq("id", groupId)
    .maybeSingle();
  return data;
}

async function setCurrentAvg(
  supabase: Supabase,
  groupId: string,
  avg: number | null,
): Promise<void> {
  await supabase
    .from("cattle_groups")
    .update({ current_avg_weight_lbs: avg })
    .eq("id", groupId);
}

/** Remove live weight when head leave (death, sale, or move out). Call before head count drops. */
export async function adjustLotWeightOnHeadRemoval(
  supabase: Supabase,
  groupId: string,
  headBefore: number,
  headRemoved: number,
  options?: { explicitWeightLbs?: number | null },
): Promise<void> {
  if (headRemoved <= 0 || headBefore <= 0) return;

  const group = await loadGroupWeightRow(supabase, groupId);
  if (!group) return;

  const avg = getEffectiveAvgWeightLbs(group);
  const weightRemoved =
    options?.explicitWeightLbs != null && options.explicitWeightLbs > 0
      ? options.explicitWeightLbs
      : avg != null
        ? impliedWeightForHead(avg, headRemoved)
        : null;

  if (weightRemoved == null || weightRemoved <= 0 || avg == null) return;

  const headAfter = headBefore - headRemoved;
  const newAvg = avgAfterWeightRemoval(headBefore, avg, headRemoved, weightRemoved);
  await setCurrentAvg(supabase, groupId, headAfter > 0 ? newAvg : null);
}

/** Add live weight when head arrive (move in). Call before head count rises. */
export async function adjustLotWeightOnHeadAddition(
  supabase: Supabase,
  groupId: string,
  headBefore: number,
  headAdded: number,
  weightAddedLbs: number,
): Promise<void> {
  if (headAdded <= 0 || weightAddedLbs <= 0) return;

  const group = await loadGroupWeightRow(supabase, groupId);
  if (!group) return;

  const avg = getEffectiveAvgWeightLbs(group);
  const headAfter = headBefore + headAdded;
  const newAvg = avgAfterWeightAddition(headBefore, avg, headAdded, weightAddedLbs);
  await setCurrentAvg(supabase, groupId, headAfter > 0 ? newAvg : null);
}

/** Reverse a prior head removal (void death, restore inventory). */
export async function adjustLotWeightOnHeadRestored(
  supabase: Supabase,
  groupId: string,
  headBefore: number,
  headRestored: number,
  options?: { explicitWeightLbs?: number | null },
): Promise<void> {
  if (headRestored <= 0) return;

  const group = await loadGroupWeightRow(supabase, groupId);
  if (!group) return;

  const avg = getEffectiveAvgWeightLbs(group);
  const weightAdded =
    options?.explicitWeightLbs != null && options.explicitWeightLbs > 0
      ? options.explicitWeightLbs
      : avg != null
        ? impliedWeightForHead(avg, headRestored)
        : null;

  if (weightAdded == null || weightAdded <= 0) return;

  await adjustLotWeightOnHeadAddition(supabase, groupId, headBefore, headRestored, weightAdded);
}

/** Move weight between lots after inventory RPC (head counts already updated). */
export async function applyMoveWeightTransfer(
  supabase: Supabase,
  sourceGroupId: string,
  destGroupId: string,
  headMoved: number,
  outWeightLbs: number | null | undefined,
  headCountsBefore: { source: number; dest: number },
): Promise<void> {
  if (headMoved <= 0) return;

  const sourceGroup = await loadGroupWeightRow(supabase, sourceGroupId);
  if (!sourceGroup) return;

  const sourceAvg = getEffectiveAvgWeightLbs(sourceGroup);
  const weightMoved =
    outWeightLbs != null && outWeightLbs > 0
      ? outWeightLbs
      : sourceAvg != null
        ? impliedWeightForHead(sourceAvg, headMoved)
        : null;

  if (weightMoved == null || weightMoved <= 0) return;

  if (sourceAvg != null && headCountsBefore.source > 0) {
    const sourceHeadAfter = headCountsBefore.source - headMoved;
    const newSourceAvg = avgAfterWeightRemoval(
      headCountsBefore.source,
      sourceAvg,
      headMoved,
      weightMoved,
    );
    await setCurrentAvg(supabase, sourceGroupId, sourceHeadAfter > 0 ? newSourceAvg : null);
  }

  await adjustLotWeightOnHeadAddition(
    supabase,
    destGroupId,
    headCountsBefore.dest,
    headMoved,
    weightMoved,
  );
}

/** Reverse a completed move's weight effect (void or before re-applying an edit). */
export async function reverseMoveWeightTransfer(
  supabase: Supabase,
  sourceGroupId: string,
  destGroupId: string,
  headMoved: number,
  outWeightLbs: number | null | undefined,
  headCountsBeforeReverse: { source: number; dest: number },
): Promise<void> {
  if (headMoved <= 0) return;

  const destGroup = await loadGroupWeightRow(supabase, destGroupId);
  const destAvg = destGroup ? getEffectiveAvgWeightLbs(destGroup) : null;

  const weightMoved =
    outWeightLbs != null && outWeightLbs > 0
      ? outWeightLbs
      : destAvg != null
        ? impliedWeightForHead(destAvg, headMoved)
        : null;

  if (weightMoved == null || weightMoved <= 0) return;

  const sourceHeadBefore = headCountsBeforeReverse.source;
  await adjustLotWeightOnHeadRestored(supabase, sourceGroupId, sourceHeadBefore, headMoved, {
    explicitWeightLbs: weightMoved,
  });

  if (destAvg != null && headCountsBeforeReverse.dest > 0) {
    const destHeadAfter = headCountsBeforeReverse.dest - headMoved;
    const newDestAvg = avgAfterWeightRemoval(
      headCountsBeforeReverse.dest,
      destAvg,
      headMoved,
      weightMoved,
    );
    await setCurrentAvg(supabase, destGroupId, destHeadAfter > 0 ? newDestAvg : null);
  }
}

export { lotHeadCount };
