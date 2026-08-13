import { aggregateLotPurchases } from "@/lib/lots/purchase-rollups";
import type { LotPurchaseRecord } from "@/lib/lots/purchase-types";
import type { CattleGroupSummary } from "./types";

export interface ResolvedLotMetrics {
  starting_head: number | null;
  avg_weight_lbs: number | null;
  current_avg_weight_lbs: number | null;
}

export function getLotOwnerName(group: CattleGroupSummary): string | null {
  return group.owner_name ?? group.customer_name ?? group.ownership_group_name ?? null;
}

/** Primary lot label — lot number when assigned, otherwise group name. */
export function getLotDisplayTitle(group: Pick<CattleGroupSummary, "lot_number" | "name">): string {
  return group.lot_number?.trim() || group.name;
}

/** Secondary line for lot cards and headers — owner and pen. */
export function getLotDisplaySubtitle(group: CattleGroupSummary): string {
  const owner = getLotOwnerName(group);
  const location = getLotLocationLabel(group);
  const parts: string[] = [];
  if (owner) parts.push(owner);
  if (location !== "No location assigned") parts.push(location);
  return parts.join(" · ");
}

export function getLotReceivedDate(group: CattleGroupSummary): string | null {
  return group.arrival_date ?? group.opened_at ?? group.purchase_date ?? null;
}

export function daysOnFeed(receivedIso: string | null): number | null {
  if (!receivedIso) return null;
  const start = new Date(`${receivedIso}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Leaf location label for display. */
export function getLotLocationLabel(group: CattleGroupSummary): string {
  if (group.location_name) return group.location_name;
  if (group.location_breadcrumb) {
    const parts = group.location_breadcrumb.split(" › ");
    return parts[parts.length - 1] ?? group.location_breadcrumb;
  }
  return "No location assigned";
}

export function getLotPropertyName(group: CattleGroupSummary): string | null {
  if (!group.location_breadcrumb) return null;
  const parts = group.location_breadcrumb.split(" › ");
  return parts[0] ?? null;
}

export function getEffectiveStartingHead(
  group: Pick<CattleGroupSummary, "starting_head" | "total_head">,
  purchases?: LotPurchaseRecord[],
): number | null {
  if (group.starting_head != null && group.starting_head > 0) {
    return group.starting_head;
  }
  if (purchases?.length) {
    const rollupHead = aggregateLotPurchases(purchases).starting_head;
    if (rollupHead > 0) return rollupHead;
  }
  if (group.total_head > 0) return group.total_head;
  return null;
}

export function resolveLotMetrics(
  group: CattleGroupSummary,
  purchases?: LotPurchaseRecord[],
): ResolvedLotMetrics {
  const rollup = purchases?.length ? aggregateLotPurchases(purchases) : null;
  const starting_head = getEffectiveStartingHead(group, purchases);

  const avg_weight_lbs =
    group.avg_weight_lbs != null && group.avg_weight_lbs > 0
      ? group.avg_weight_lbs
      : rollup?.avg_weight_lbs != null && rollup.avg_weight_lbs > 0
        ? rollup.avg_weight_lbs
        : group.received_weight_lbs != null && starting_head != null && starting_head > 0
          ? Math.round((group.received_weight_lbs / starting_head) * 10) / 10
          : rollup?.received_weight_lbs != null && starting_head != null && starting_head > 0
            ? Math.round((rollup.received_weight_lbs / starting_head) * 10) / 10
            : group.pay_weight_lbs != null && starting_head != null && starting_head > 0
              ? Math.round((group.pay_weight_lbs / starting_head) * 10) / 10
              : rollup?.pay_weight_lbs != null && starting_head != null && starting_head > 0
                ? Math.round((rollup.pay_weight_lbs / starting_head) * 10) / 10
                : null;

  const current_avg_weight_lbs =
    group.current_avg_weight_lbs != null && group.current_avg_weight_lbs > 0
      ? group.current_avg_weight_lbs
      : avg_weight_lbs;

  return { starting_head, avg_weight_lbs, current_avg_weight_lbs };
}

export function needsLotRollupRepair(
  group: Pick<CattleGroupSummary, "starting_head" | "avg_weight_lbs">,
  purchases: LotPurchaseRecord[],
): boolean {
  if (!purchases.length) return false;
  if (group.starting_head == null || group.starting_head <= 0) return true;
  const hasWeights = purchases.some(
    (p) => (p.pay_weight_lbs ?? 0) > 0 || (p.received_weight_lbs ?? 0) > 0,
  );
  return hasWeights && (group.avg_weight_lbs == null || group.avg_weight_lbs <= 0);
}

export function getAvgReceivedWeightLbs(
  group: CattleGroupSummary,
  purchases?: LotPurchaseRecord[],
): number | null {
  const metrics = resolveLotMetrics(group, purchases);
  return metrics.avg_weight_lbs;
}

export function buildLotSupportingDetails(group: CattleGroupSummary): string[] {
  const details: string[] = [];
  const received = getLotReceivedDate(group);
  if (received) {
    const days = daysOnFeed(received);
    const receivedLabel = `Received ${formatShortDate(received)}`;
    details.push(days != null ? `${receivedLabel} · ${days} days on feed` : receivedLabel);
  }

  const avgWt = getAvgReceivedWeightLbs(group);
  if (avgWt != null) {
    details.push(`Avg received ${avgWt.toLocaleString()} lbs`);
  }

  if (group.current_avg_weight_lbs != null && group.current_avg_weight_lbs > 0) {
    const received = getAvgReceivedWeightLbs(group);
    if (received == null || Math.abs(group.current_avg_weight_lbs - received) > 0.5) {
      details.push(`Current avg ${group.current_avg_weight_lbs.toLocaleString()} lbs`);
    }
  }

  if (group.open_treatment_count > 0) {
    details.push(`${group.open_treatment_count} treatment${group.open_treatment_count === 1 ? "" : "s"}`);
  }

  if (group.feedings_today > 0) {
    details.push(`Fed today (${group.feedings_today})`);
  }

  if (group.seller_name) {
    details.push(`Seller: ${group.seller_name}`);
  } else if (group.source_name) {
    details.push(`Source: ${group.source_name}`);
  }

  const property = getLotPropertyName(group);
  if (property && property !== getLotLocationLabel(group)) {
    details.push(property);
  }

  return details.slice(0, 3);
}
