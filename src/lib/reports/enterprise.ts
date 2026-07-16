import { createClient } from "@/lib/supabase/server";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { ENTERPRISE_LABELS, type EnterpriseType } from "@/lib/lots/types";
import type { EnterprisePlRow } from "./types";

export async function getEnterprisePlReport(orgId: string): Promise<EnterprisePlRow[]> {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("cattle_groups")
    .select("id, enterprise_type, landed_cost")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const enterpriseByGroup = new Map(
    groups.map((g) => [g.id, g.enterprise_type ?? "stocker"]),
  );

  const [
    { data: headRows },
    { data: feedings },
    { data: treatments },
    { data: processing },
    { data: sales },
    { data: expenses },
    { data: deaths },
    { data: meds },
  ] = await Promise.all([
    supabase
      .from("group_inventory_counts")
      .select("cattle_group_id, head_count")
      .eq("organization_id", orgId)
      .in("cattle_group_id", groupIds),
    supabase
      .from("feeding_records")
      .select("cattle_group_id, quantity, total_feed_cost, feed_ration_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("treatment_records")
      .select("cattle_group_id, quantity_used, medicine_item_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("processing_events")
      .select(
        "cattle_group_id, chute_charge, labor_charge, processing_fee, medicine_cost",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("sales_records")
      .select("cattle_group_id, total_amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("lot_expenses")
      .select("cattle_group_id, amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase
      .from("mortality_records")
      .select("cattle_group_id, value_lost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("cattle_group_id", groupIds),
    supabase.from("medicine_items").select("id, price_per_cc").eq("organization_id", orgId),
  ]);

  const rationIds = [
    ...new Set((feedings ?? []).map((f) => f.feed_ration_id).filter(Boolean)),
  ] as string[];
  const rationPrices = await getRationUnitPrices(orgId, rationIds);
  const medPrice = new Map(
    (meds ?? []).map((m) => [m.id, m.price_per_cc != null ? Number(m.price_per_cc) : 0]),
  );

  const buckets = new Map<
    string,
    EnterprisePlRow & { _groups: Set<string> }
  >();

  function bucket(type: string): EnterprisePlRow & { _groups: Set<string> } {
    const key = type || "stocker";
    let row = buckets.get(key);
    if (!row) {
      row = {
        enterprise_type: key,
        label:
          ENTERPRISE_LABELS[key as EnterpriseType] ??
          key.replace(/_/g, " "),
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
      buckets.set(key, row);
    }
    return row;
  }

  for (const g of groups) {
    const row = bucket(g.enterprise_type ?? "stocker");
    row._groups.add(g.id);
    row.purchase_cost += g.landed_cost != null ? Number(g.landed_cost) : 0;
  }

  for (const h of headRows ?? []) {
    if (!h.cattle_group_id) continue;
    const type = enterpriseByGroup.get(h.cattle_group_id) ?? "stocker";
    bucket(type).current_head += h.head_count ?? 0;
  }

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

  for (const t of treatments ?? []) {
    if (!t.cattle_group_id || !t.medicine_item_id) continue;
    const type = enterpriseByGroup.get(t.cattle_group_id) ?? "stocker";
    bucket(type).medicine_cost +=
      Number(t.quantity_used ?? 0) * (medPrice.get(t.medicine_item_id) ?? 0);
  }

  for (const p of processing ?? []) {
    if (!p.cattle_group_id) continue;
    const type = enterpriseByGroup.get(p.cattle_group_id) ?? "stocker";
    bucket(type).processing_cost +=
      Number(p.chute_charge ?? 0) +
      Number(p.labor_charge ?? 0) +
      Number(p.processing_fee ?? 0) +
      Number(p.medicine_cost ?? 0);
  }

  for (const s of sales ?? []) {
    if (!s.cattle_group_id) continue;
    const type = enterpriseByGroup.get(s.cattle_group_id) ?? "stocker";
    bucket(type).sale_revenue += Number(s.total_amount ?? 0);
  }

  for (const e of expenses ?? []) {
    const type = enterpriseByGroup.get(e.cattle_group_id) ?? "stocker";
    bucket(type).other_expenses += Number(e.amount);
  }

  for (const d of deaths ?? []) {
    if (!d.cattle_group_id) continue;
    const type = enterpriseByGroup.get(d.cattle_group_id) ?? "stocker";
    bucket(type).other_expenses += d.value_lost != null ? Number(d.value_lost) : 0;
  }

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
        purchase_cost: round2(rest.purchase_cost),
        feed_cost: round2(row.feed_cost),
        medicine_cost: round2(row.medicine_cost),
        processing_cost: round2(row.processing_cost),
        other_expenses: round2(row.other_expenses),
        sale_revenue: round2(row.sale_revenue),
        total_invested: round2(total_invested),
        net_position: round2(net_position),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
