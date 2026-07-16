import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveRationUnitPrice } from "./costing";
import type {
  FeedItemOption,
  FeedItemRecord,
  FeedPurchaseRecord,
  FeedRationIngredient,
  FeedRationPriceHistory,
  FeedStockAdjustment,
} from "./inventory-types";

export async function listFeedItems(orgId: string): Promise<FeedItemRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("feed_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");

  if (error || !rows?.length) return [];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString();

  const { data: adjustments } = await supabase
    .from("feed_stock_adjustments")
    .select("feed_item_id, delta")
    .eq("organization_id", orgId)
    .eq("adjustment_type", "feeding")
    .gte("created_at", weekStart);

  const weeklyUse = new Map<string, number>();
  for (const row of adjustments ?? []) {
    const used = Math.abs(Number(row.delta));
    weeklyUse.set(row.feed_item_id, (weeklyUse.get(row.feed_item_id) ?? 0) + used);
  }

  return rows.map((r) => {
    const onHand = Number(r.quantity_on_hand);
    const weekly = weeklyUse.get(r.id) ?? 0;
    const dailyUse = weekly / 7;
    const projected =
      dailyUse > 0 ? Math.round((onHand / dailyUse) * 10) / 10 : null;

    return {
      id: r.id,
      name: r.name,
      unit: r.unit,
      quantity_on_hand: onHand,
      price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : null,
      reorder_at: r.reorder_at != null ? Number(r.reorder_at) : null,
      notes: r.notes,
      is_low_stock:
        r.reorder_at != null && onHand <= Number(r.reorder_at),
      projected_days_remaining: projected,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export async function getFeedItem(orgId: string, itemId: string): Promise<FeedItemRecord | null> {
  const items = await listFeedItems(orgId);
  return items.find((i) => i.id === itemId) ?? null;
}

export async function listFeedItemOptions(orgId: string): Promise<FeedItemOption[]> {
  const items = await listFeedItems(orgId);
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    quantity_on_hand: i.quantity_on_hand,
    price_per_unit: i.price_per_unit,
  }));
}

export async function countLowStockFeedItems(orgId: string): Promise<number> {
  const items = await listFeedItems(orgId);
  return items.filter((i) => i.is_low_stock).length;
}

export async function listFeedStockAdjustments(
  orgId: string,
  itemId: string,
  limit = 20,
): Promise<FeedStockAdjustment[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("feed_stock_adjustments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("feed_item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  const profileIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  return rows.map((r) => ({
    id: r.id,
    feed_item_id: r.feed_item_id,
    previous_quantity: Number(r.previous_quantity),
    new_quantity: Number(r.new_quantity),
    delta: Number(r.delta),
    adjustment_type: r.adjustment_type as FeedStockAdjustment["adjustment_type"],
    feeding_record_id: r.feeding_record_id,
    notes: r.notes,
    created_by_name: r.created_by ? names.get(r.created_by) ?? null : null,
    created_at: r.created_at,
  }));
}

export async function listFeedPurchases(
  orgId: string,
  itemId: string,
  limit = 20,
): Promise<FeedPurchaseRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("feed_purchases")
    .select("*")
    .eq("organization_id", orgId)
    .eq("feed_item_id", itemId)
    .eq("is_active", true)
    .order("purchased_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  return rows.map((r) => ({
    id: r.id,
    feed_item_id: r.feed_item_id,
    purchased_at: r.purchased_at,
    vendor_name: r.vendor_name,
    quantity: Number(r.quantity),
    unit_cost: Number(r.unit_cost),
    total_cost: Number(r.total_cost),
    invoice_ref: r.invoice_ref,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export async function listRationIngredients(
  orgId: string,
  rationId: string,
): Promise<FeedRationIngredient[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("feed_ration_ingredients")
    .select("id, feed_ration_id, feed_item_id, quantity_per_ration_unit, inclusion_percent")
    .eq("organization_id", orgId)
    .eq("feed_ration_id", rationId);

  if (!rows?.length) return [];

  const itemIds = [...new Set(rows.map((r) => r.feed_item_id))];
  const { data: items } = await supabase
    .from("feed_items")
    .select("id, name, unit, price_per_unit")
    .in("id", itemIds);

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));

  return rows.map((r) => {
    const item = itemById.get(r.feed_item_id);
    return {
      id: r.id,
      feed_ration_id: r.feed_ration_id,
      feed_item_id: r.feed_item_id,
      feed_item_name: item?.name ?? "Feedstuff",
      feed_item_unit: item?.unit ?? "",
      quantity_per_ration_unit: Number(r.quantity_per_ration_unit),
      inclusion_percent:
        r.inclusion_percent != null ? Number(r.inclusion_percent) : null,
      price_per_unit: item?.price_per_unit != null ? Number(item.price_per_unit) : null,
    };
  });
}

export async function getRationUnitPrices(
  orgId: string,
  rationIds: string[],
  supabaseClient?: SupabaseClient<Database>,
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (!rationIds.length) return prices;

  const supabase = supabaseClient ?? (await createClient());
  const { data: rations } = await supabase
    .from("feed_rations")
    .select("id, price_per_unit")
    .eq("organization_id", orgId)
    .in("id", rationIds);

  const rationPrice = new Map(
    (rations ?? []).map((r) => [
      r.id,
      r.price_per_unit != null ? Number(r.price_per_unit) : null,
    ]),
  );

  const { data: ingredientRows } = await supabase
    .from("feed_ration_ingredients")
    .select("feed_ration_id, feed_item_id, quantity_per_ration_unit")
    .eq("organization_id", orgId)
    .in("feed_ration_id", rationIds);

  const itemIds = [...new Set((ingredientRows ?? []).map((r) => r.feed_item_id))];
  const { data: items } = itemIds.length
    ? await supabase.from("feed_items").select("id, price_per_unit").in("id", itemIds)
    : { data: [] };

  const itemPrice = new Map(
    (items ?? []).map((i) => [i.id, i.price_per_unit != null ? Number(i.price_per_unit) : 0]),
  );

  const ingredientsByRation = new Map<string, Array<{ quantity_per_ration_unit: number; price_per_unit: number | null }>>();
  for (const row of ingredientRows ?? []) {
    const list = ingredientsByRation.get(row.feed_ration_id) ?? [];
    list.push({
      quantity_per_ration_unit: Number(row.quantity_per_ration_unit),
      price_per_unit: itemPrice.get(row.feed_item_id) ?? null,
    });
    ingredientsByRation.set(row.feed_ration_id, list);
  }

  for (const rationId of rationIds) {
    const manual = rationPrice.get(rationId) ?? null;
    const ingredients = ingredientsByRation.get(rationId) ?? [];
    prices.set(rationId, resolveRationUnitPrice(manual, ingredients));
  }

  return prices;
}

export function rationPriceLookupKey(rationId: string, asOfDate: string): string {
  return `${rationId}|${asOfDate}`;
}

export async function listRationPriceHistory(
  orgId: string,
  rationId: string,
  limit = 20,
): Promise<FeedRationPriceHistory[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("feed_ration_price_history")
    .select("id, feed_ration_id, price_per_unit, effective_from, created_by, created_at")
    .eq("organization_id", orgId)
    .eq("feed_ration_id", rationId)
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];

  const profileIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  return rows.map((r) => ({
    id: r.id,
    feed_ration_id: r.feed_ration_id,
    price_per_unit: Number(r.price_per_unit),
    effective_from: r.effective_from,
    created_by_name: r.created_by ? names.get(r.created_by) ?? null : null,
    created_at: r.created_at,
  }));
}

export async function getRationUnitPriceAtDate(
  orgId: string,
  rationId: string,
  asOfDate: string,
): Promise<number> {
  const prices = await getRationUnitPricesAtDates(orgId, [{ rationId, asOfDate }]);
  return prices.get(rationPriceLookupKey(rationId, asOfDate)) ?? 0;
}

export async function getRationUnitPricesAtDates(
  orgId: string,
  items: Array<{ rationId: string; asOfDate: string }>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!items.length) return result;

  const rationIds = [...new Set(items.map((i) => i.rationId))];
  const supabase = await createClient();

  const [{ data: historyRows }, currentPrices] = await Promise.all([
    supabase
      .from("feed_ration_price_history")
      .select("feed_ration_id, price_per_unit, effective_from")
      .eq("organization_id", orgId)
      .in("feed_ration_id", rationIds)
      .order("effective_from", { ascending: false }),
    getRationUnitPrices(orgId, rationIds),
  ]);

  const historyByRation = new Map<
    string,
    Array<{ effective_from: string; price_per_unit: number }>
  >();
  for (const row of historyRows ?? []) {
    const list = historyByRation.get(row.feed_ration_id) ?? [];
    list.push({
      effective_from: row.effective_from,
      price_per_unit: Number(row.price_per_unit),
    });
    historyByRation.set(row.feed_ration_id, list);
  }

  for (const item of items) {
    const key = rationPriceLookupKey(item.rationId, item.asOfDate);
    const history = historyByRation.get(item.rationId) ?? [];
    const match = history.find((h) => h.effective_from <= item.asOfDate);
    const price = match?.price_per_unit ?? currentPrices.get(item.rationId) ?? 0;
    result.set(key, price);
  }

  return result;
}
