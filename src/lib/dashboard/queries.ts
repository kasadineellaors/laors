import { listFeedItems } from "@/lib/feed/inventory-queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS, type EnterpriseType, type LotStatus } from "@/lib/lots/types";
import { getOperationPlSummary } from "@/lib/reports/operations-pl";
import { currentMonthKey } from "@/lib/reports/period";

const ATTENTION_STATUSES: LotStatus[] = [
  "receiving",
  "hospital",
  "ready_to_sell",
  "partially_sold",
];

export type EnterpriseHeadRow = {
  enterprise_type: string;
  label: string;
  head: number;
  lot_count: number;
};

export type AttentionLot = {
  id: string;
  label: string;
  status: string;
  status_label: string;
  head: number;
  location: string | null;
};

export type LowFeedAlert = {
  id: string;
  name: string;
  quantity_on_hand: number;
  unit: string;
};

export type DashboardCommandCenter = {
  month_label: string;
  active_lots: number;
  closed_lots: number;
  total_open_head: number;
  head_by_enterprise: EnterpriseHeadRow[];
  sale_revenue: number;
  operating_costs: number;
  net_operating_pl: number;
  head_sold_this_month: number;
  lots_received_this_month: number;
  low_feed_items: LowFeedAlert[];
  attention_lots: AttentionLot[];
};

export async function getDashboardCommandCenter(
  orgId: string,
): Promise<DashboardCommandCenter> {
  const month = currentMonthKey();
  const [groups, monthlyPl, feedItems] = await Promise.all([
    listCattleGroups(orgId),
    getOperationPlSummary(orgId, month),
    listFeedItems(orgId),
  ]);

  const openGroups = groups.filter((g) => g.lot_status !== "closed");
  const closedLots = groups.filter((g) => g.lot_status === "closed").length;

  const enterpriseBuckets = new Map<string, { head: number; lot_count: number }>();
  for (const group of openGroups) {
    const key = group.enterprise_type || "stocker";
    const bucket = enterpriseBuckets.get(key) ?? { head: 0, lot_count: 0 };
    bucket.head += group.total_head;
    bucket.lot_count += 1;
    enterpriseBuckets.set(key, bucket);
  }

  const head_by_enterprise = [...enterpriseBuckets.entries()]
    .map(([enterprise_type, stats]) => ({
      enterprise_type,
      label:
        ENTERPRISE_LABELS[enterprise_type as EnterpriseType] ??
        enterprise_type.replace(/_/g, " "),
      head: stats.head,
      lot_count: stats.lot_count,
    }))
    .sort((a, b) => b.head - a.head);

  const attention_lots = openGroups
    .filter((g) => ATTENTION_STATUSES.includes(g.lot_status as LotStatus) && g.total_head > 0)
    .map((g) => ({
      id: g.id,
      label: g.lot_number || g.name,
      status: g.lot_status,
      status_label:
        LOT_STATUS_LABELS[g.lot_status as LotStatus] ?? g.lot_status,
      head: g.total_head,
      location: g.location_breadcrumb,
    }))
    .sort((a, b) => a.status_label.localeCompare(b.status_label));

  const low_feed_items = feedItems
    .filter((item) => item.is_low_stock)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity_on_hand: item.quantity_on_hand,
      unit: item.unit,
    }));

  return {
    month_label: monthlyPl.monthLabel,
    active_lots: openGroups.length,
    closed_lots: closedLots,
    total_open_head: openGroups.reduce((sum, g) => sum + g.total_head, 0),
    head_by_enterprise,
    sale_revenue: monthlyPl.saleRevenue,
    operating_costs: monthlyPl.totalOperatingCosts,
    net_operating_pl: monthlyPl.netOperatingPl,
    head_sold_this_month: monthlyPl.headSold,
    lots_received_this_month: monthlyPl.lotsReceived,
    low_feed_items,
    attention_lots,
  };
}
