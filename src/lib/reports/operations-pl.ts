import { createClient } from "@/lib/supabase/server";
import {
  getRationUnitPricesAtDates,
  rationPriceLookupKey,
} from "@/lib/feed/inventory-queries";
import { currentMonthKey, monthBounds, roundMoney } from "./period";
import type { OperationPlSummary } from "./types";

type FeedingRow = {
  quantity: number;
  total_feed_cost: number | null;
  feed_ration_id: string;
  fed_at: string;
  unit_cost_snapshot: number | null;
};

export async function sumFeedCostForPeriod(
  orgId: string,
  feedings: FeedingRow[],
): Promise<number> {
  const missingPriceLookups = feedings
    .filter((f) => f.total_feed_cost == null)
    .map((f) => ({ rationId: f.feed_ration_id, asOfDate: f.fed_at }));
  const historicalPrices = await getRationUnitPricesAtDates(orgId, missingPriceLookups);

  let feedCost = 0;
  for (const f of feedings) {
    if (f.total_feed_cost != null) {
      feedCost += Number(f.total_feed_cost);
    } else {
      const unitCost =
        f.unit_cost_snapshot != null
          ? Number(f.unit_cost_snapshot)
          : historicalPrices.get(rationPriceLookupKey(f.feed_ration_id, f.fed_at)) ?? 0;
      feedCost += unitCost * Number(f.quantity);
    }
  }
  return feedCost;
}

export async function getOperationPlSummary(
  orgId: string,
  month = currentMonthKey(),
): Promise<OperationPlSummary> {
  const supabase = await createClient();
  const { start, end, label } = monthBounds(month);

  const [
    { data: sales },
    { data: feedings },
    { data: purchases },
    { data: expenses },
    { data: deaths },
    { data: lots },
    { data: treatments },
    { data: processing },
    { data: meds },
  ] = await Promise.all([
    supabase
      .from("sales_records")
      .select("head_count, total_amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("sale_date", start)
      .lte("sale_date", end),
    supabase
      .from("feeding_records")
      .select("quantity, total_feed_cost, feed_ration_id, fed_at, unit_cost_snapshot")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("fed_at", start)
      .lte("fed_at", end),
    supabase
      .from("feed_purchases")
      .select("total_cost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("purchased_at", start)
      .lte("purchased_at", end),
    supabase
      .from("lot_expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("expense_date", start)
      .lte("expense_date", end),
    supabase
      .from("mortality_records")
      .select("head_count, value_lost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("died_at", start)
      .lte("died_at", end),
    supabase
      .from("cattle_groups")
      .select("starting_head, landed_cost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("purchase_date", start)
      .lte("purchase_date", end),
    supabase
      .from("treatment_records")
      .select("quantity_used, medicine_item_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("treatment_date", start)
      .lte("treatment_date", end),
    supabase
      .from("processing_events")
      .select("chute_charge, labor_charge, processing_fee, medicine_cost")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("processed_at", start)
      .lte("processed_at", end),
    supabase.from("medicine_items").select("id, price_per_cc").eq("organization_id", orgId),
  ]);

  const medPrice = new Map(
    (meds ?? []).map((m) => [m.id, m.price_per_cc != null ? Number(m.price_per_cc) : 0]),
  );

  const feedCost = await sumFeedCostForPeriod(orgId, (feedings ?? []) as FeedingRow[]);
  const feedQuantity = (feedings ?? []).reduce((s, f) => s + Number(f.quantity), 0);

  let medicineCost = 0;
  for (const t of treatments ?? []) {
    if (t.medicine_item_id && t.quantity_used) {
      medicineCost +=
        Number(t.quantity_used) * (medPrice.get(t.medicine_item_id) ?? 0);
    }
  }

  let processingCost = 0;
  for (const p of processing ?? []) {
    processingCost +=
      Number(p.chute_charge ?? 0) +
      Number(p.labor_charge ?? 0) +
      Number(p.processing_fee ?? 0) +
      Number(p.medicine_cost ?? 0);
  }

  const saleRevenue = (sales ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const cattlePurchases = (lots ?? []).reduce(
    (s, l) => s + (l.landed_cost != null ? Number(l.landed_cost) : 0),
    0,
  );
  const otherExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const mortalityLoss = (deaths ?? []).reduce(
    (s, d) => s + (d.value_lost != null ? Number(d.value_lost) : 0),
    0,
  );
  const commodityPurchases = (purchases ?? []).reduce(
    (s, p) => s + Number(p.total_cost),
    0,
  );

  const operatingCosts =
    cattlePurchases + feedCost + medicineCost + processingCost + otherExpenses + mortalityLoss;

  return {
    month,
    monthLabel: label,
    headSold: (sales ?? []).reduce((s, r) => s + (r.head_count ?? 0), 0),
    lotsReceived: (lots ?? []).reduce((s, l) => s + (l.starting_head ?? 0), 0),
    deaths: (deaths ?? []).reduce((s, d) => s + (d.head_count ?? 0), 0),
    saleRevenue: roundMoney(saleRevenue),
    feedDeliveries: feedings?.length ?? 0,
    feedQuantity: Math.round(feedQuantity * 100) / 100,
    cattlePurchases: roundMoney(cattlePurchases),
    feedCost: roundMoney(feedCost),
    medicineCost: roundMoney(medicineCost),
    processingCost: roundMoney(processingCost),
    otherExpenses: roundMoney(otherExpenses),
    mortalityLoss: roundMoney(mortalityLoss),
    commodityPurchases: roundMoney(commodityPurchases),
    totalOperatingCosts: roundMoney(operatingCosts),
    netOperatingPl: roundMoney(saleRevenue - operatingCosts),
  };
}
