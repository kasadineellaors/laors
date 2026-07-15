import { createClient } from "@/lib/supabase/server";
import type {
  FeedItemOption,
  FeedItemRecord,
  FeedRationIngredient,
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

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    quantity_on_hand: Number(r.quantity_on_hand),
    price_per_unit: r.price_per_unit != null ? Number(r.price_per_unit) : null,
    reorder_at: r.reorder_at != null ? Number(r.reorder_at) : null,
    notes: r.notes,
    is_low_stock:
      r.reorder_at != null && Number(r.quantity_on_hand) <= Number(r.reorder_at),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
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

export async function listRationIngredients(
  orgId: string,
  rationId: string,
): Promise<FeedRationIngredient[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("feed_ration_ingredients")
    .select("id, feed_ration_id, feed_item_id, quantity_per_ration_unit")
    .eq("organization_id", orgId)
    .eq("feed_ration_id", rationId);

  if (!rows?.length) return [];

  const itemIds = [...new Set(rows.map((r) => r.feed_item_id))];
  const { data: items } = await supabase
    .from("feed_items")
    .select("id, name, unit")
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
    };
  });
}
