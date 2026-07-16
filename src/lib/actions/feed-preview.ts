"use server";

import { createClient } from "@/lib/supabase/server";
import { getRationUnitPriceAtDate } from "@/lib/feed/inventory-queries";

export interface FeedStockShortage {
  itemId: string;
  itemName: string;
  unit: string;
  needed: number;
  onHand: number;
}

export interface FeedStockCheckResult {
  ok: boolean;
  shortages: FeedStockShortage[];
  hasRecipe: boolean;
}

export interface FeedCostEstimate {
  unitCost: number;
  totalCost: number;
  amountPerHead: number | null;
  costPerHead: number | null;
}

export async function checkFeedingStock(
  orgId: string,
  rationId: string,
  quantity: number,
): Promise<FeedStockCheckResult> {
  if (!rationId || quantity <= 0) {
    return { ok: true, shortages: [], hasRecipe: false };
  }

  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("feed_ration_ingredients")
    .select("feed_item_id, quantity_per_ration_unit")
    .eq("organization_id", orgId)
    .eq("feed_ration_id", rationId);

  if (!ingredients?.length) {
    return { ok: true, shortages: [], hasRecipe: false };
  }

  const itemIds = [...new Set(ingredients.map((i) => i.feed_item_id))];
  const { data: items } = await supabase
    .from("feed_items")
    .select("id, name, unit, quantity_on_hand")
    .eq("organization_id", orgId)
    .in("id", itemIds);

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const shortages: FeedStockShortage[] = [];

  for (const ing of ingredients) {
    const needed = quantity * Number(ing.quantity_per_ration_unit);
    const item = itemById.get(ing.feed_item_id);
    if (!item) continue;
    const onHand = Number(item.quantity_on_hand);
    if (needed > onHand) {
      shortages.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        needed: Math.round(needed * 100) / 100,
        onHand,
      });
    }
  }

  return { ok: shortages.length === 0, shortages, hasRecipe: true };
}

export async function estimateFeedingCost(
  orgId: string,
  rationId: string,
  quantity: number,
  fedAt: string,
  headCount?: number | null,
): Promise<FeedCostEstimate> {
  if (!rationId || quantity <= 0) {
    return { unitCost: 0, totalCost: 0, amountPerHead: null, costPerHead: null };
  }

  const unitCost = await getRationUnitPriceAtDate(orgId, rationId, fedAt);
  const totalCost = Math.round(unitCost * quantity * 100) / 100;
  const heads = headCount != null && headCount > 0 ? headCount : null;

  return {
    unitCost,
    totalCost,
    amountPerHead: heads ? Math.round((quantity / heads) * 100) / 100 : null,
    costPerHead: heads && totalCost > 0 ? Math.round((totalCost / heads) * 100) / 100 : null,
  };
}

export interface RationAvailability {
  rationId: string;
  canFulfill: boolean;
  limitingItem: string | null;
}

/** Max ration quantity fulfillable with current ingredient stock (for 1 unit of ration recipe). */
export async function getRationAvailability(
  orgId: string,
  rationIds: string[],
): Promise<RationAvailability[]> {
  if (!rationIds.length) return [];

  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from("feed_ration_ingredients")
    .select("feed_ration_id, feed_item_id, quantity_per_ration_unit")
    .eq("organization_id", orgId)
    .in("feed_ration_id", rationIds);

  if (!ingredients?.length) {
    return rationIds.map((rationId) => ({
      rationId,
      canFulfill: true,
      limitingItem: null,
    }));
  }

  const itemIds = [...new Set(ingredients.map((i) => i.feed_item_id))];
  const { data: items } = await supabase
    .from("feed_items")
    .select("id, name, quantity_on_hand")
    .eq("organization_id", orgId)
    .in("id", itemIds);

  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const byRation = new Map<string, typeof ingredients>();
  for (const ing of ingredients) {
    const list = byRation.get(ing.feed_ration_id) ?? [];
    list.push(ing);
    byRation.set(ing.feed_ration_id, list);
  }

  return rationIds.map((rationId) => {
    const recipe = byRation.get(rationId);
    if (!recipe?.length) {
      return { rationId, canFulfill: true, limitingItem: null };
    }

    let maxQty = Number.POSITIVE_INFINITY;
    let limitingItem: string | null = null;
    for (const ing of recipe) {
      const perUnit = Number(ing.quantity_per_ration_unit);
      if (perUnit <= 0) continue;
      const item = itemById.get(ing.feed_item_id);
      if (!item) {
        maxQty = 0;
        limitingItem = "Missing ingredient";
        break;
      }
      const possible = Number(item.quantity_on_hand) / perUnit;
      if (possible < maxQty) {
        maxQty = possible;
        limitingItem = item.name;
      }
    }

    return {
      rationId,
      canFulfill: maxQty > 0,
      limitingItem: maxQty <= 0 ? limitingItem : null,
    };
  });
}
