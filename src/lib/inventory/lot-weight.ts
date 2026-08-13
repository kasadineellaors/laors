import type { Database } from "@/types/database";

type GroupWeightRow = Pick<
  Database["public"]["Tables"]["cattle_groups"]["Row"],
  "current_avg_weight_lbs" | "avg_weight_lbs" | "received_weight_lbs" | "starting_head"
>;

/** Best available per-head weight for inventory math on a lot. */
export function getEffectiveAvgWeightLbs(group: GroupWeightRow): number | null {
  if (group.current_avg_weight_lbs != null && group.current_avg_weight_lbs > 0) {
    return Number(group.current_avg_weight_lbs);
  }
  if (group.avg_weight_lbs != null && group.avg_weight_lbs > 0) {
    return Number(group.avg_weight_lbs);
  }
  if (
    group.received_weight_lbs != null &&
    group.starting_head != null &&
    group.starting_head > 0
  ) {
    return Number(group.received_weight_lbs) / group.starting_head;
  }
  return null;
}

/** Total live weight implied by head count and average. */
export function totalLiveWeightLbs(headCount: number, avgWeightLbs: number | null): number | null {
  if (headCount <= 0 || avgWeightLbs == null || avgWeightLbs <= 0) return null;
  return headCount * avgWeightLbs;
}

/** After head leave the lot, recompute average from weight removed. */
export function avgAfterWeightRemoval(
  headBefore: number,
  avgBefore: number,
  headRemoved: number,
  weightRemovedLbs: number,
): number | null {
  const headAfter = headBefore - headRemoved;
  if (headAfter <= 0) return null;
  const totalBefore = headBefore * avgBefore;
  const totalAfter = totalBefore - weightRemovedLbs;
  if (totalAfter <= 0) return null;
  return totalAfter / headAfter;
}

/** After head arrive on a lot, blend incoming weight into the average. */
export function avgAfterWeightAddition(
  headBefore: number,
  avgBefore: number | null,
  headAdded: number,
  weightAddedLbs: number,
): number | null {
  const headAfter = headBefore + headAdded;
  if (headAfter <= 0 || weightAddedLbs <= 0) return avgBefore;
  const totalBefore = avgBefore != null && headBefore > 0 ? headBefore * avgBefore : 0;
  return (totalBefore + weightAddedLbs) / headAfter;
}

/** Weight to remove when head leave without an explicit scale weight. */
export function impliedWeightForHead(avgWeightLbs: number, headCount: number): number {
  return avgWeightLbs * headCount;
}

/** Resolve move weight: explicit outweight wins, else average × head. */
export function resolveMoveWeightLbs(
  headMoved: number,
  outWeightLbs: number | null | undefined,
  sourceAvgLbs: number | null,
): number | null {
  if (outWeightLbs != null && outWeightLbs > 0) return outWeightLbs;
  if (sourceAvgLbs != null && sourceAvgLbs > 0 && headMoved > 0) {
    return impliedWeightForHead(sourceAvgLbs, headMoved);
  }
  return null;
}
