import type { CattleGroupSummary } from "./types";

export function getLotOwnerName(group: CattleGroupSummary): string | null {
  return group.owner_name ?? group.customer_name ?? group.ownership_group_name ?? null;
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

export function getAvgReceivedWeightLbs(group: CattleGroupSummary): number | null {
  if (group.avg_weight_lbs != null && group.avg_weight_lbs > 0) {
    return group.avg_weight_lbs;
  }
  if (
    group.received_weight_lbs != null &&
    group.starting_head != null &&
    group.starting_head > 0
  ) {
    return Math.round((group.received_weight_lbs / group.starting_head) * 10) / 10;
  }
  return null;
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
