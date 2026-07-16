import { createClient } from "@/lib/supabase/server";
import {
  getRationUnitPrices,
} from "@/lib/feed/inventory-queries";
import { ENTERPRISE_LABELS, type EnterpriseType } from "@/lib/lots/types";
import { monthBounds, roundMoney } from "./period";
import { sumFeedCostForPeriod } from "./operations-pl";
import type { EnterprisePlRow } from "./types";

type Bucket = EnterprisePlRow & { _groups: Set<string> };

function createBucket(type: string): Bucket {
  const key = type || "stocker";
  return {
    enterprise_type: key,
    label: ENTERPRISE_LABELS[key as EnterpriseType] ?? key.replace(/_/g, " "),
    lot_count: 0,
    current_head: 0,
    purchase_cost: 0,
    feed_cost: 0,
    medicine_cost: 0,
    processing_cost: 0,
    other_expenses: 0,
    sale_revenue: 0,
    total_invested: 0,
    net_position: 0,
    _groups: new Set(),
  };
}

function finalizeBuckets(buckets: Map<string, Bucket>): EnterprisePlRow[] {
  return [...buckets.values()]
    .map((row) => {
      const lot_count = row._groups.size;
      const total_invested =
        row.purchase_cost +
        row.feed_cost +
        row.medicine_cost +
        row.processing_cost +
        row.other_expenses;
      const net_position = row.sale_revenue - total_invested;
      const { _groups, ...rest } = row;
      void _groups;
      return {
        ...rest,
        lot_count,
        purchase_cost: roundMoney(rest.purchase_cost),
        feed_cost: roundMoney(row.feed_cost),
        medicine_cost: roundMoney(row.medicine_cost),
        processing_cost: roundMoney(row.processing_cost),
        other_expenses: roundMoney(row.other_expenses),
        sale_revenue: roundMoney(row.sale_revenue),
        total_invested: roundMoney(total_invested),
        net_position: roundMoney(net_position),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getEnterprisePlReport(
  orgId: string,
  month?: string,
): Promise<EnterprisePlRow[]> {
  const supabase = await createClient();
  const period = month ? monthBounds(month) : null;

  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id, enterprise_type, landed_cost, purchase_date")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const enterpriseByGroup = new Map(
    groups.map((g) => [g.id, g.enterprise_type ?? "stocker"]),
  );

  const buckets = new Map<string, Bucket>();
  function bucket(type: string): Bucket {
    const key = type || "stocker";
    let row = buckets.get(key);
    if (!row) {
      row = createBucket(key);
      buckets.set(key, row);
    }
    return row;
  }

  function trackGroup(groupId: string) {
    const type = enterpriseByGroup.get(groupId) ?? "stocker";
    bucket(type)._groups.add(groupId);
  }

  for (const g of groups) {
    if (!period) {
      const row = bucket(g.enterprise_type ?? "stocker");
      row._groups.add(g.id);
      row.purchase_cost += g.landed_cost != null ? Number(g.landed_cost) : 0;
    } else if (
      g.purchase_date &&
      g.purchase_date >= period.start &&
      g.purchase_date <= period.end
    ) {
      trackGroup(g.id);
      bucket(g.enterprise_type ?? "stocker").purchase_cost +=
        g.landed_cost != null ? Number(g.landed_cost) : 0;
    }
  }

  const { data: headRows } = await supabase
    .from("group_inventory_counts")
    .select("cattle_group_id, head_count")
    .eq("organization_id", orgId)
    .in("cattle_group_id", groupIds);

  for (const h of headRows ?? []) {
    if (!h.cattle_group_id) continue;
    const type = enterpriseByGroup.get(h.cattle_group_id) ?? "stocker";
    bucket(type).current_head += h.head_count ?? 0;
  }

  let feedQuery = supabase
    .from("feeding_records")
    .select("cattle_group_id, quantity, total_feed_cost, feed_ration_id, fed_at, unit_cost_snapshot")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  let treatmentQuery = supabase
    .from("treatment_records")
    .select("cattle_group_id, quantity_used, medicine_item_id, treatment_date")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  let processingQuery = supabase
    .from("processing_events")
    .select(
      "cattle_group_id, chute_charge, labor_charge, processing_fee, medicine_cost, processed_at",
    )
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  let salesQuery = supabase
    .from("sales_records")
    .select("cattle_group_id, total_amount, sale_date")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  let expensesQuery = supabase
    .from("lot_expenses")
    .select("cattle_group_id, amount, expense_date")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  let deathsQuery = supabase
    .from("mortality_records")
    .select("cattle_group_id, value_lost, died_at")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .in("cattle_group_id", groupIds);

  if (period) {
    feedQuery = feedQuery.gte("fed_at", period.start).lte("fed_at", period.end);
    treatmentQuery = treatmentQuery
      .gte("treatment_date", period.start)
      .lte("treatment_date", period.end);
    processingQuery = processingQuery
      .gte("processed_at", period.start)
      .lte("processed_at", period.end);
    salesQuery = salesQuery.gte("sale_date", period.start).lte("sale_date", period.end);
    expensesQuery = expensesQuery
      .gte("expense_date", period.start)
      .lte("expense_date", period.end);
    deathsQuery = deathsQuery.gte("died_at", period.start).lte("died_at", period.end);
  }

  const [
    { data: feedings },
    { data: treatments },
    { data: processing },
    { data: sales },
    { data: expenses },
    { data: deaths },
    { data: meds },
  ] = await Promise.all([
    feedQuery,
    treatmentQuery,
    processingQuery,
    salesQuery,
    expensesQuery,
    deathsQuery,
    supabase.from("medicine_items").select("id, price_per_cc").eq("organization_id", orgId),
  ]);

  const medPrice = new Map(
    (meds ?? []).map((m) => [m.id, m.price_per_cc != null ? Number(m.price_per_cc) : 0]),
  );

  if (period) {
    const feedingsByGroup = new Map<string, typeof feedings>();
    for (const f of feedings ?? []) {
      if (!f.cattle_group_id) continue;
      trackGroup(f.cattle_group_id);
      const list = feedingsByGroup.get(f.cattle_group_id) ?? [];
      list.push(f);
      feedingsByGroup.set(f.cattle_group_id, list);
    }

    for (const [groupId, groupFeedings] of feedingsByGroup) {
      const type = enterpriseByGroup.get(groupId) ?? "stocker";
      const cost = await sumFeedCostForPeriod(
        orgId,
        (groupFeedings ?? []).map((f) => ({
          quantity: Number(f.quantity),
          total_feed_cost: f.total_feed_cost,
          feed_ration_id: f.feed_ration_id,
          fed_at: f.fed_at,
          unit_cost_snapshot: f.unit_cost_snapshot,
        })),
      );
      bucket(type).feed_cost += cost;
    }
  } else {
    const rationIds = [
      ...new Set((feedings ?? []).map((f) => f.feed_ration_id).filter(Boolean)),
    ] as string[];
    const rationPrices = await getRationUnitPrices(orgId, rationIds);

    for (const f of feedings ?? []) {
      if (!f.cattle_group_id) continue;
      const type = enterpriseByGroup.get(f.cattle_group_id) ?? "stocker";
      const row = bucket(type);
      if (f.total_feed_cost != null) {
        row.feed_cost += Number(f.total_feed_cost);
      } else {
        const price = rationPrices.get(f.feed_ration_id) ?? 0;
        row.feed_cost += Number(f.quantity) * price;
      }
    }
  }

  for (const t of treatments ?? []) {
    if (!t.cattle_group_id || !t.medicine_item_id) continue;
    trackGroup(t.cattle_group_id);
    const type = enterpriseByGroup.get(t.cattle_group_id) ?? "stocker";
    bucket(type).medicine_cost +=
      Number(t.quantity_used ?? 0) * (medPrice.get(t.medicine_item_id) ?? 0);
  }

  for (const p of processing ?? []) {
    if (!p.cattle_group_id) continue;
    trackGroup(p.cattle_group_id);
    const type = enterpriseByGroup.get(p.cattle_group_id) ?? "stocker";
    bucket(type).processing_cost +=
      Number(p.chute_charge ?? 0) +
      Number(p.labor_charge ?? 0) +
      Number(p.processing_fee ?? 0) +
      Number(p.medicine_cost ?? 0);
  }

  for (const s of sales ?? []) {
    if (!s.cattle_group_id) continue;
    trackGroup(s.cattle_group_id);
    const type = enterpriseByGroup.get(s.cattle_group_id) ?? "stocker";
    bucket(type).sale_revenue += Number(s.total_amount ?? 0);
  }

  for (const e of expenses ?? []) {
    trackGroup(e.cattle_group_id);
    const type = enterpriseByGroup.get(e.cattle_group_id) ?? "stocker";
    bucket(type).other_expenses += Number(e.amount);
  }

  for (const d of deaths ?? []) {
    if (!d.cattle_group_id) continue;
    trackGroup(d.cattle_group_id);
    const type = enterpriseByGroup.get(d.cattle_group_id) ?? "stocker";
    bucket(type).other_expenses += d.value_lost != null ? Number(d.value_lost) : 0;
  }

  return finalizeBuckets(buckets);
}
