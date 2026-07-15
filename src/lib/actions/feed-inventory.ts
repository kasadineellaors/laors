"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { FeedAdjustmentType } from "@/lib/feed/inventory-types";

export type FeedInventoryActionState = {
  error?: string;
  success?: string;
  itemId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE17.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("feed_items") ||
    message.includes("feed_stock") ||
    message.includes("feed_ration_ingredients") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateFeedInventory() {
  revalidatePath("/feed");
  revalidatePath("/feed/inventory");
  revalidatePath("/feed/rations");
  revalidatePath("/feed/log");
  revalidatePath("/dashboard");
}

async function requireMember(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) throw new Error("Not authorized");
  return { supabase, user };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<Database>;

export async function applyFeedDelta(
  supabase: AnySupabase,
  orgId: string,
  userId: string,
  feedItemId: string,
  delta: number,
  adjustmentType: FeedAdjustmentType,
  options?: { feedingRecordId?: string; notes?: string },
): Promise<{ error?: string }> {
  const { data: item, error: fetchError } = await supabase
    .from("feed_items")
    .select("quantity_on_hand")
    .eq("id", feedItemId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError) return { error: formatDbError(fetchError.message) };
  if (!item) return { error: "Feedstuff not found" };

  const previous = Number(item.quantity_on_hand);
  const newQty = previous + delta;
  if (newQty < 0) return { error: "Not enough feed on hand" };

  const { error: updateError } = await supabase
    .from("feed_items")
    .update({ quantity_on_hand: newQty })
    .eq("id", feedItemId)
    .eq("organization_id", orgId);

  if (updateError) return { error: formatDbError(updateError.message) };

  const { error: adjError } = await supabase.from("feed_stock_adjustments").insert({
    organization_id: orgId,
    feed_item_id: feedItemId,
    previous_quantity: previous,
    new_quantity: newQty,
    delta,
    adjustment_type: adjustmentType,
    feeding_record_id: options?.feedingRecordId ?? null,
    notes: options?.notes?.trim() || null,
    created_by: userId,
  });

  if (adjError) return { error: formatDbError(adjError.message) };
  return {};
}

export async function createFeedItem(
  orgId: string,
  input: {
    name: string;
    unit?: string;
    quantityOnHand?: number;
    reorderAt?: number;
    pricePerUnit?: number;
    notes?: string;
  },
): Promise<FeedInventoryActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const qty = input.quantityOnHand ?? 0;
    if (qty < 0) return { error: "Quantity cannot be negative" };

    const { data, error } = await supabase
      .from("feed_items")
      .insert({
        organization_id: orgId,
        name,
        unit: input.unit?.trim() || "ton",
        quantity_on_hand: qty,
        reorder_at: input.reorderAt ?? null,
        price_per_unit: input.pricePerUnit ?? null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateFeedInventory();
    return { success: "Feedstuff saved", itemId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateFeedItem(
  orgId: string,
  itemId: string,
  input: {
    name?: string;
    unit?: string;
    reorderAt?: number | null;
    pricePerUnit?: number | null;
    notes?: string | null;
  },
): Promise<FeedInventoryActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const updates: Database["public"]["Tables"]["feed_items"]["Update"] = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.unit !== undefined) updates.unit = input.unit.trim() || "ton";
    if (input.reorderAt !== undefined) updates.reorder_at = input.reorderAt;
    if (input.pricePerUnit !== undefined) updates.price_per_unit = input.pricePerUnit;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase
      .from("feed_items")
      .update(updates)
      .eq("id", itemId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeedInventory();
    revalidatePath(`/feed/inventory/${itemId}`);
    return { success: "Feedstuff updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function adjustFeedStock(
  orgId: string,
  itemId: string,
  input: {
    delta?: number;
    adjustmentType: FeedAdjustmentType;
    notes?: string;
  },
): Promise<FeedInventoryActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    if (input.delta === undefined) return { error: "Provide quantity" };

    const result = await applyFeedDelta(
      supabase,
      orgId,
      user.id,
      itemId,
      input.delta,
      input.adjustmentType,
      { notes: input.notes },
    );
    if (result.error) return { error: result.error };

    revalidateFeedInventory();
    revalidatePath(`/feed/inventory/${itemId}`);
    return { success: "Stock updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveFeedItem(
  orgId: string,
  itemId: string,
): Promise<FeedInventoryActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("feed_items")
      .update({ is_active: false })
      .eq("id", itemId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeedInventory();
    return { success: "Feedstuff archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function saveFeedRationIngredients(
  orgId: string,
  rationId: string,
  ingredients: Array<{ feedItemId: string; quantityPerRationUnit: number }>,
): Promise<FeedInventoryActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    const { data: member } = await supabase
      .from("organization_members")
      .select("system_role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member || !["owner", "manager"].includes(member.system_role)) {
      return { error: "Managers only" };
    }

    await supabase
      .from("feed_ration_ingredients")
      .delete()
      .eq("organization_id", orgId)
      .eq("feed_ration_id", rationId);

    const valid = ingredients.filter(
      (i) => i.feedItemId && i.quantityPerRationUnit > 0,
    );
    if (valid.length > 0) {
      const { error } = await supabase.from("feed_ration_ingredients").insert(
        valid.map((i) => ({
          organization_id: orgId,
          feed_ration_id: rationId,
          feed_item_id: i.feedItemId,
          quantity_per_ration_unit: i.quantityPerRationUnit,
        })),
      );
      if (error) return { error: formatDbError(error.message) };
    }

    revalidateFeedInventory();
    revalidatePath(`/feed/rations/${rationId}`);
    return { success: "Ration recipe saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

async function getFeedingDeductions(
  supabase: AnySupabase,
  orgId: string,
  rationId: string,
  quantity: number,
): Promise<Array<{ feedItemId: string; delta: number }>> {
  const { data: ingredients } = await supabase
    .from("feed_ration_ingredients")
    .select("feed_item_id, quantity_per_ration_unit")
    .eq("organization_id", orgId)
    .eq("feed_ration_id", rationId);

  if (!ingredients?.length) return [];

  return ingredients.map((i) => ({
    feedItemId: i.feed_item_id,
    delta: -quantity * Number(i.quantity_per_ration_unit),
  }));
}

export async function syncFeedingStock(
  supabase: AnySupabase,
  orgId: string,
  userId: string,
  feedingId: string,
  previous: { rationId: string | null; quantity: number | null },
  next: { rationId: string | null; quantity: number | null },
): Promise<{ error?: string }> {
  if (previous.rationId === next.rationId && previous.quantity === next.quantity) {
    return {};
  }

  if (previous.rationId && previous.quantity) {
    const restoreLines = await getFeedingDeductions(
      supabase,
      orgId,
      previous.rationId,
      previous.quantity,
    );
    for (const line of restoreLines) {
      const result = await applyFeedDelta(
        supabase,
        orgId,
        userId,
        line.feedItemId,
        -line.delta,
        "feeding",
        { feedingRecordId: feedingId, notes: "Feeding updated — stock restored" },
      );
      if (result.error) return result;
    }
  }

  if (next.rationId && next.quantity) {
    const deductLines = await getFeedingDeductions(
      supabase,
      orgId,
      next.rationId,
      next.quantity,
    );
    for (const line of deductLines) {
      const result = await applyFeedDelta(
        supabase,
        orgId,
        userId,
        line.feedItemId,
        line.delta,
        "feeding",
        { feedingRecordId: feedingId, notes: "Feeding logged" },
      );
      if (result.error) return result;
    }
  }

  return {};
}
