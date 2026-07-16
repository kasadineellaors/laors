import { weightedAverageCost } from "@/lib/feed/costing";

export { weightedAverageCost };

/** Billable unit price from inventory average cost and owner markup (markup hidden on invoice). */
export function medicineBillableUnitPrice(
  avgUnitCost: number,
  markupPercent: number,
): number {
  const factor = 1 + (markupPercent ?? 0) / 100;
  return Math.round(avgUnitCost * factor * 10000) / 10000;
}
