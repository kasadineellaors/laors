import { createClient } from "@/lib/supabase/server";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { sumLotExpenses } from "@/lib/expenses/queries";
import type {
  LotOperationalSummary,
  MortalityRecord,
  ProcessingEventRecord,
  ProcessingType,
} from "./types";

export async function getLotOperationalSummary(
  orgId: string,
  groupId: string,
  landedCost: number | null,
  openedAt: string | null,
  currentHead: number,
  avgWeightInLbs: number | null = null,
): Promise<LotOperationalSummary> {
  const supabase = await createClient();

  const [
    { data: feedings },
    { data: treatments },
    { data: processing },
    { data: sales },
    { data: deaths },
  ] = await Promise.all([
    supabase
      .from("feeding_records")
      .select("quantity, feed_ration_id, total_feed_cost")
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("treatment_records")
      .select("quantity_used, medicine_item_id")
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("processing_events")
      .select("chute_charge, labor_charge, processing_fee, medicine_cost")
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("sales_records")
      .select("head_count, total_amount, avg_weight_lbs")
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("mortality_records")
      .select("head_count, value_lost")
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true),
  ]);

  const rationIds = [
    ...new Set((feedings ?? []).map((f) => f.feed_ration_id).filter(Boolean)),
  ] as string[];
  const [rationPrice, otherExpenses] = await Promise.all([
    getRationUnitPrices(orgId, rationIds),
    sumLotExpenses(orgId, groupId),
  ]);

  const medicineIds = [
    ...new Set((treatments ?? []).map((t) => t.medicine_item_id).filter(Boolean)),
  ] as string[];
  const { data: meds } = medicineIds.length
    ? await supabase.from("medicine_items").select("id, price_per_cc").in("id", medicineIds)
    : { data: [] };
  const medPrice = new Map(
    (meds ?? []).map((m) => [m.id, m.price_per_cc != null ? Number(m.price_per_cc) : 0]),
  );

  let estimatedFeedCost = 0;
  for (const f of feedings ?? []) {
    if (f.total_feed_cost != null) {
      estimatedFeedCost += Number(f.total_feed_cost);
    } else {
      const price = rationPrice.get(f.feed_ration_id) ?? 0;
      estimatedFeedCost += Number(f.quantity) * price;
    }
  }

  let estimatedMedicineCost = 0;
  for (const t of treatments ?? []) {
    if (t.medicine_item_id && t.quantity_used) {
      estimatedMedicineCost +=
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

  let headsSold = 0;
  let saleRevenue = 0;
  let weightedSaleWeight = 0;
  let saleWeightHeads = 0;
  for (const s of sales ?? []) {
    headsSold += s.head_count ?? 0;
    saleRevenue += s.total_amount != null ? Number(s.total_amount) : 0;
    if (s.avg_weight_lbs != null && (s.head_count ?? 0) > 0) {
      weightedSaleWeight += Number(s.avg_weight_lbs) * (s.head_count ?? 0);
      saleWeightHeads += s.head_count ?? 0;
    }
  }

  const avgSaleWeightLbs =
    saleWeightHeads > 0 ? weightedSaleWeight / saleWeightHeads : null;

  let deathCount = 0;
  let deathValue = 0;
  for (const d of deaths ?? []) {
    deathCount += d.head_count ?? 0;
    deathValue += d.value_lost != null ? Number(d.value_lost) : 0;
  }

  const purchase = landedCost ?? 0;
  const totalInvested =
    purchase +
    estimatedFeedCost +
    estimatedMedicineCost +
    processingCost +
    deathValue +
    otherExpenses;
  const openDate = openedAt ? new Date(openedAt + "T12:00:00") : new Date();
  const daysOnFeed = Math.max(
    0,
    Math.floor((Date.now() - openDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const headDivisor = Math.max(1, currentHead);

  let totalGainLbs: number | null = null;
  let adgLbs: number | null = null;
  let feedCostPerLbGain: number | null = null;

  if (
    avgSaleWeightLbs != null &&
    avgWeightInLbs != null &&
    headsSold > 0 &&
    avgSaleWeightLbs > avgWeightInLbs
  ) {
    totalGainLbs = (avgSaleWeightLbs - avgWeightInLbs) * headsSold;
    if (daysOnFeed > 0) {
      adgLbs = (avgSaleWeightLbs - avgWeightInLbs) / daysOnFeed;
    }
    if (totalGainLbs > 0) {
      feedCostPerLbGain = estimatedFeedCost / totalGainLbs;
    }
  }

  return {
    days_on_feed: daysOnFeed,
    feed_events: feedings?.length ?? 0,
    estimated_feed_cost: estimatedFeedCost,
    treatment_events: treatments?.length ?? 0,
    estimated_medicine_cost: estimatedMedicineCost,
    processing_cost: processingCost,
    heads_sold: headsSold,
    sale_revenue: saleRevenue,
    deaths: deathCount,
    death_value_lost: deathValue,
    other_expenses: otherExpenses,
    total_invested: totalInvested,
    estimated_cost_per_head: totalInvested / headDivisor,
    avg_sale_weight_lbs: avgSaleWeightLbs,
    total_gain_lbs: totalGainLbs,
    adg_lbs: adgLbs,
    feed_cost_per_lb_gain: feedCostPerLbGain,
  };
}

export async function listProcessingEvents(
  orgId: string,
  groupId: string,
): Promise<ProcessingEventRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("processing_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .order("processed_at", { ascending: false });

  return (rows ?? []).map((r) => ({
    id: r.id,
    processed_at: r.processed_at,
    head_count: r.head_count,
    processing_type: r.processing_type as ProcessingType,
    chute_charge: Number(r.chute_charge ?? 0),
    labor_charge: Number(r.labor_charge ?? 0),
    processing_fee: Number(r.processing_fee ?? 0),
    medicine_cost: Number(r.medicine_cost ?? 0),
    total_cost:
      Number(r.chute_charge ?? 0) +
      Number(r.labor_charge ?? 0) +
      Number(r.processing_fee ?? 0) +
      Number(r.medicine_cost ?? 0),
    notes: r.notes,
  }));
}

export async function listMortalityRecords(
  orgId: string,
  groupId: string,
): Promise<MortalityRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("mortality_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .order("died_at", { ascending: false });

  return (rows ?? []).map((r) => ({
    id: r.id,
    died_at: r.died_at,
    head_count: r.head_count,
    cause: r.cause,
    disposal_method: r.disposal_method,
    value_lost: r.value_lost != null ? Number(r.value_lost) : null,
    notes: r.notes,
  }));
}
