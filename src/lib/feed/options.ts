import type { OwnerOption } from "@/lib/owners/types";
import type { SelectOption } from "@/lib/locations/options";
import type { CattleGroupSummary } from "@/lib/inventory/types";

export function ownersToSelectOptions(owners: OwnerOption[]): SelectOption[] {
  return owners.map((o) => ({ value: o.id, label: o.name }));
}

export function toFeedGroupOptions(groups: CattleGroupSummary[]): SelectOption[] {
  return groups.map((g) => ({
    value: g.id,
    label: `${g.lot_number || g.name} (${g.total_head} hd)`,
    meta: {
      name: g.lot_number || g.name,
      owner_id: g.owner_id,
      ownership_group_id: g.ownership_group_id,
      ownership_group_name: g.ownership_group_name,
      customer_name: g.customer_name,
      owner_name: g.owner_name,
      location_id: g.location_id,
      location_name: g.location_name,
      location_breadcrumb: g.location_breadcrumb,
      total_head: g.total_head,
    },
  }));
}

export function rationCostsToRecord(costs: Map<string, number>): Record<string, number> {
  return Object.fromEntries(costs);
}
