import { getCattleGroup } from "@/lib/inventory/queries";
import { getLotOperationalSummary } from "@/lib/lots/queries";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS } from "@/lib/lots/types";
import { createClient } from "@/lib/supabase/server";

export type CloseoutRow = { label: string; value: string };
export type CloseoutSection = { title: string; rows: CloseoutRow[] };

export type LotCloseoutPrintData = {
  orgName: string;
  lotLabel: string;
  subtitle: string;
  sections: CloseoutSection[];
  netProfit: number;
};

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export async function getLotCloseoutPrintData(
  orgId: string,
  groupId: string,
): Promise<LotCloseoutPrintData | null> {
  const supabase = await createClient();
  const [group, { data: org }] = await Promise.all([
    getCattleGroup(orgId, groupId),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);

  if (!group) return null;

  const summary = await getLotOperationalSummary(
    orgId,
    groupId,
    group.landed_cost,
    group.opened_at ?? group.arrival_date ?? group.purchase_date,
    group.total_head,
    group.avg_weight_lbs,
  );

  const startingHead =
    group.starting_head ?? group.total_head + summary.heads_sold + summary.deaths;
  const endingHead = group.total_head;
  const headReconciled = startingHead - summary.heads_sold - summary.deaths - endingHead;
  const purchaseCost = group.landed_cost ?? 0;
  const totalExpenses =
    purchaseCost +
    summary.estimated_feed_cost +
    summary.estimated_medicine_cost +
    summary.processing_cost +
    summary.death_value_lost +
    summary.other_expenses;
  const netProfit = summary.sale_revenue - totalExpenses;
  const profitPerHead =
    summary.heads_sold > 0
      ? netProfit / summary.heads_sold
      : netProfit / Math.max(1, endingHead);

  const enterprise =
    ENTERPRISE_LABELS[group.enterprise_type as keyof typeof ENTERPRISE_LABELS] ??
    group.enterprise_type;
  const status =
    LOT_STATUS_LABELS[group.lot_status as keyof typeof LOT_STATUS_LABELS] ?? group.lot_status;

  const payWeight = group.pay_weight_lbs;
  const avgWeightIn = group.avg_weight_lbs;
  const shrinkPct =
    payWeight != null && avgWeightIn != null && payWeight > 0
      ? ((payWeight - avgWeightIn) / payWeight) * 100
      : null;
  const breakevenPerHead =
    summary.heads_sold > 0 ? totalExpenses / summary.heads_sold : null;
  const feedPerHeadDay =
    startingHead > 0 && summary.days_on_feed > 0
      ? summary.estimated_feed_cost / startingHead / summary.days_on_feed
      : null;

  const performanceRows: CloseoutRow[] = [];
  if (payWeight != null) performanceRows.push({ label: "Pay weight", value: `${Math.round(payWeight)} lb` });
  if (avgWeightIn != null) {
    performanceRows.push({ label: "Avg weight in", value: `${Math.round(avgWeightIn)} lb` });
  }
  if (shrinkPct != null) {
    performanceRows.push({ label: "Shrink (pay → received)", value: `${shrinkPct.toFixed(1)}%` });
  }
  if (group.purchase_price_per_lb != null) {
    performanceRows.push({
      label: "Purchase $/lb",
      value: `$${Number(group.purchase_price_per_lb).toFixed(2)}`,
    });
  }
  if (breakevenPerHead != null) {
    performanceRows.push({ label: "Breakeven $/head sold", value: money(breakevenPerHead) });
  }
  if (feedPerHeadDay != null) {
    performanceRows.push({ label: "Feed $/head/day", value: money(feedPerHeadDay) });
  }
  if (summary.avg_sale_weight_lbs != null) {
    performanceRows.push({
      label: "Avg sale weight",
      value: `${Math.round(summary.avg_sale_weight_lbs)} lb`,
    });
  }
  if (summary.total_gain_lbs != null) {
    performanceRows.push({
      label: "Total gain (sold)",
      value: `${Math.round(summary.total_gain_lbs)} lb`,
    });
  }
  if (summary.adg_lbs != null) {
    performanceRows.push({ label: "ADG", value: `${summary.adg_lbs.toFixed(2)} lb/day` });
  }
  if (summary.feed_cost_per_lb_gain != null) {
    performanceRows.push({
      label: "Feed cost / lb gain",
      value: money(summary.feed_cost_per_lb_gain),
    });
  }

  const sections: CloseoutSection[] = [
    {
      title: "Lot identity",
      rows: [
        { label: "Owner", value: group.ownership_group_name ?? "Ranch" },
        { label: "Customer", value: group.customer_name ?? "—" },
        { label: "Seller", value: group.seller_name ?? "—" },
        { label: "Source", value: group.source_name ?? "—" },
        { label: "Purchase date", value: group.purchase_date ?? "—" },
        { label: "Arrival", value: group.arrival_date ?? group.opened_at ?? "—" },
        { label: "Pen", value: group.location_breadcrumb ?? "—" },
        { label: "Days on feed", value: String(summary.days_on_feed) },
      ],
    },
    {
      title: "Inventory reconciliation",
      rows: [
        { label: "Head purchased", value: String(startingHead) },
        { label: "Head sold", value: String(summary.heads_sold) },
        { label: "Deaths", value: String(summary.deaths) },
        { label: "Ending head", value: String(endingHead) },
        {
          label: "Reconciliation",
          value: headReconciled === 0 ? "Balanced" : `${headReconciled} difference`,
        },
      ],
    },
    {
      title: "Feed & health",
      rows: [
        { label: "Feed events", value: String(summary.feed_events) },
        { label: "Feed cost", value: money(summary.estimated_feed_cost) },
        {
          label: "Feed cost / head",
          value: money(summary.estimated_feed_cost / Math.max(1, startingHead)),
        },
        { label: "Treatments", value: String(summary.treatment_events) },
        { label: "Medicine cost", value: money(summary.estimated_medicine_cost) },
        { label: "Processing cost", value: money(summary.processing_cost) },
        { label: "Other expenses", value: money(summary.other_expenses) },
      ],
    },
  ];

  if (performanceRows.length > 0) {
    sections.push({ title: "Performance", rows: performanceRows });
  }

  sections.push({
    title: "Financial performance",
    rows: [
      { label: "Purchase cost", value: money(purchaseCost) },
      { label: "Total expenses", value: money(totalExpenses) },
      { label: "Sale revenue", value: money(summary.sale_revenue) },
      { label: "Net profit / loss", value: money(netProfit) },
      { label: "Profit per head", value: money(profitPerHead) },
      { label: "Cost per head (invested)", value: money(summary.estimated_cost_per_head) },
    ],
  });

  return {
    orgName: org?.name ?? "LAORS Ranch",
    lotLabel: group.lot_number || group.name,
    subtitle: `${enterprise} · ${status}`,
    sections,
    netProfit,
  };
}
