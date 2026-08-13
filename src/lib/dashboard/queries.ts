import { createClient } from "@/lib/supabase/server";
import { listFeedItems } from "@/lib/feed/inventory-queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { buildLotAdgSnapshot, computeOperationAdgLbs } from "@/lib/inventory/adg";
import { daysOnFeed, getLotReceivedDate } from "@/lib/inventory/lot-display";
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

export type LotAdgRow = {
  id: string;
  label: string;
  head: number;
  adg_lbs: number;
  days_on_feed: number;
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
  deaths_this_month: number;
  /** Cumulative deaths on open lots ÷ placed head (starting head). */
  death_loss_pct: number;
  death_loss_deaths: number;
  death_loss_placed_head: number;
  /** Head-weighted ADG across open lots with weight + days on feed. */
  operation_adg_lbs: number | null;
  operation_adg_lot_count: number;
  lot_adg_rows: LotAdgRow[];
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

  const openGroupIds = openGroups.map((g) => g.id);
  let deathLossDeaths = 0;
  if (openGroupIds.length > 0) {
    const supabase = await createClient();
    const { data: deathRows } = await supabase
      .from("mortality_records")
      .select("head_count")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", openGroupIds);
    deathLossDeaths = (deathRows ?? []).reduce((s, d) => s + (d.head_count ?? 0), 0);
  }

  const placedHead = openGroups.reduce((sum, g) => {
    const starting = g.starting_head ?? 0;
    if (starting > 0) return sum + starting;
    return sum + g.total_head;
  }, 0);

  const death_loss_pct =
    placedHead > 0 ? Math.round((deathLossDeaths / placedHead) * 1000) / 10 : 0;

  const lotAdgRows: LotAdgRow[] = [];
  const adgForOperation: { adgLbs: number; head: number }[] = [];

  for (const group of openGroups) {
    if (group.total_head <= 0) continue;
    const days = daysOnFeed(getLotReceivedDate(group));
    if (days == null || days <= 0) continue;
    const snapshot = buildLotAdgSnapshot(group, days);
    if (snapshot.adgLbs == null) continue;
    lotAdgRows.push({
      id: group.id,
      label: group.lot_number || group.name,
      head: group.total_head,
      adg_lbs: Math.round(snapshot.adgLbs * 10) / 10,
      days_on_feed: days,
    });
    adgForOperation.push({ adgLbs: snapshot.adgLbs, head: group.total_head });
  }

  lotAdgRows.sort((a, b) => b.adg_lbs - a.adg_lbs);

  const operation_adg_lbs = (() => {
    const value = computeOperationAdgLbs(adgForOperation);
    return value != null ? Math.round(value * 10) / 10 : null;
  })();

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
    deaths_this_month: monthlyPl.deaths,
    death_loss_pct,
    death_loss_deaths: deathLossDeaths,
    death_loss_placed_head: placedHead,
    operation_adg_lbs,
    operation_adg_lot_count: lotAdgRows.length,
    lot_adg_rows: lotAdgRows,
  };
}
