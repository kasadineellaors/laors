import type { CattleGroupSummary } from "@/lib/inventory/types";
import { getAvgReceivedWeightLbs } from "@/lib/inventory/lot-display";

export interface LotAdgInput {
  weightInLbs: number | null;
  currentWeightLbs: number | null;
  daysOnFeed: number | null;
}

export interface LotAdgSnapshot extends LotAdgInput {
  adgLbs: number | null;
}

/** Live average weight on the lot (after moves, deaths, etc.). */
export function getCurrentAvgWeightLbs(
  group: Pick<CattleGroupSummary, "current_avg_weight_lbs" | "avg_weight_lbs">,
): number | null {
  if (group.current_avg_weight_lbs != null && group.current_avg_weight_lbs > 0) {
    return group.current_avg_weight_lbs;
  }
  if (group.avg_weight_lbs != null && group.avg_weight_lbs > 0) {
    return group.avg_weight_lbs;
  }
  return null;
}

/** ADG (lb/day) from weight in → current weight over days on feed. */
export function computeLotAdgLbs(input: LotAdgInput): number | null {
  const { weightInLbs, currentWeightLbs, daysOnFeed } = input;
  if (
    weightInLbs == null ||
    currentWeightLbs == null ||
    daysOnFeed == null ||
    daysOnFeed <= 0
  ) {
    return null;
  }
  return (currentWeightLbs - weightInLbs) / daysOnFeed;
}

/** Head-weighted ranch ADG across lots with a calculable ADG. */
export function computeOperationAdgLbs(
  lots: { adgLbs: number; head: number }[],
): number | null {
  let weighted = 0;
  let head = 0;
  for (const lot of lots) {
    if (lot.head <= 0) continue;
    weighted += lot.adgLbs * lot.head;
    head += lot.head;
  }
  if (head <= 0) return null;
  return weighted / head;
}

export function buildLotAdgSnapshot(
  group: CattleGroupSummary,
  daysOnFeed: number,
): LotAdgSnapshot {
  const weightInLbs = getAvgReceivedWeightLbs(group);
  const currentWeightLbs = getCurrentAvgWeightLbs(group);
  return {
    weightInLbs,
    currentWeightLbs,
    daysOnFeed,
    adgLbs: computeLotAdgLbs({
      weightInLbs,
      currentWeightLbs,
      daysOnFeed,
    }),
  };
}

export function formatAdgLbs(adg: number | null): string {
  if (adg == null) return "—";
  const rounded = Math.round(adg * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded} lb/day`;
}
