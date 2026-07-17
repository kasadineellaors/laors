"use server";

import { createClient } from "@/lib/supabase/server";
import { syncFeedingStock, saveFeedRationIngredients } from "@/lib/actions/feed-inventory";
import type { FeedRationIngredientInput } from "@/lib/feed/inventory-types";
import {
  getRationUnitPriceAtDate,
  getRationUnitPrices,
} from "@/lib/feed/inventory-queries";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { FeedingContext } from "@/lib/feed/types";

type RationUpdate = Database["public"]["Tables"]["feed_rations"]["Update"];
type FeedingUpdate = Database["public"]["Tables"]["feeding_records"]["Update"];

export type FeedActionState = {
  error?: string;
  success?: string;
  rationId?: string;
  feedingId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE22.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("feed_rations") ||
    message.includes("feeding_records") ||
    message.includes("feed_ration_price_history") ||
    message.includes("unit_cost_snapshot") ||
    message.includes("total_feed_cost") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** owners.id and ownership_groups.id are different FK targets — never mix them. */
function feedingOwnerColumns(input: {
  ownerId?: string | null;
  ownershipGroupId?: string | null;
}): { owner_id: string | null; ownership_group_id: string | null } {
  const ownerId = input.ownerId?.trim() || null;
  const ownershipGroupId = input.ownershipGroupId?.trim() || null;

  if (ownerId && ownershipGroupId) {
    return { owner_id: ownerId, ownership_group_id: ownershipGroupId };
  }
  if (ownerId) {
    return { owner_id: ownerId, ownership_group_id: null };
  }
  if (ownershipGroupId) {
    return { owner_id: ownershipGroupId, ownership_group_id: ownershipGroupId };
  }
  return { owner_id: null, ownership_group_id: null };
}

async function resolvedRationUnitCost(orgId: string, rationId: string): Promise<number> {
  const prices = await getRationUnitPrices(orgId, [rationId]);
  return prices.get(rationId) ?? 0;
}

async function recordRationPriceHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  rationId: string,
  pricePerUnit: number,
  effectiveFrom: string,
) {
  if (pricePerUnit <= 0) return;

  const { error } = await supabase.from("feed_ration_price_history").insert({
    organization_id: orgId,
    feed_ration_id: rationId,
    price_per_unit: pricePerUnit,
    effective_from: effectiveFrom,
    created_by: userId,
  });

  if (error) throw new Error(formatDbError(error.message));
}

function revalidateFeed() {
  revalidatePath("/feed");
  revalidatePath("/feed/inventory");
  revalidatePath("/feed/rations");
  revalidatePath("/feed/log");
  revalidatePath("/cow-calf");
  revalidatePath("/feed/cow-calf");
  revalidatePath("/dashboard");
  revalidatePath("/invoices/generate");
  revalidatePath("/reports");
  revalidatePath("/reports/monthly");
  revalidatePath("/reports/enterprise");
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
  return { supabase, user, role: member.system_role };
}

async function requireManager(orgId: string) {
  const ctx = await requireMember(orgId);
  if (!["owner", "manager"].includes(ctx.role)) {
    throw new Error("Managers only");
  }
  return ctx;
}

export async function createFeedRation(
  orgId: string,
  input: {
    name: string;
    unit?: string;
    pricePerUnit?: number;
    priceEffectiveFrom?: string;
    notes?: string;
    ingredients?: FeedRationIngredientInput[];
  },
): Promise<FeedActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Ration name is required" };

  try {
    const { supabase, user } = await requireManager(orgId);
    const effectiveFrom = input.priceEffectiveFrom?.trim() || todayIso();
    const { data, error } = await supabase
      .from("feed_rations")
      .insert({
        organization_id: orgId,
        name,
        unit: input.unit?.trim() || "ton",
        price_per_unit: input.pricePerUnit ?? null,
        effective_from: effectiveFrom,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };

    if (input.ingredients?.length) {
      const recipe = await saveFeedRationIngredients(orgId, data.id, input.ingredients);
      if (recipe.error) return { error: recipe.error };
    }

    const unitCost = await resolvedRationUnitCost(orgId, data.id);
    if (unitCost > 0) {
      await supabase
        .from("feed_rations")
        .update({ price_per_unit: unitCost, effective_from: effectiveFrom })
        .eq("id", data.id)
        .eq("organization_id", orgId);
      await recordRationPriceHistory(supabase, orgId, user.id, data.id, unitCost, effectiveFrom);
    }

    revalidateFeed();
    return { success: "Ration saved", rationId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateFeedRation(
  orgId: string,
  rationId: string,
  input: {
    name?: string;
    unit?: string;
    pricePerUnit?: number | null;
    priceEffectiveFrom?: string;
    notes?: string | null;
    ingredients?: FeedRationIngredientInput[];
  },
): Promise<FeedActionState> {
  try {
    const { supabase, user } = await requireManager(orgId);
    const previousCost = await resolvedRationUnitCost(orgId, rationId);

    const updates: RationUpdate = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.unit !== undefined) updates.unit = input.unit.trim() || "ton";
    if (input.pricePerUnit !== undefined) updates.price_per_unit = input.pricePerUnit;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("feed_rations")
        .update(updates)
        .eq("id", rationId)
        .eq("organization_id", orgId);

      if (error) return { error: formatDbError(error.message) };
    }

    if (input.ingredients !== undefined) {
      const recipe = await saveFeedRationIngredients(orgId, rationId, input.ingredients);
      if (recipe.error) return { error: recipe.error };
    }

    const nextCost = await resolvedRationUnitCost(orgId, rationId);
    const priceChanged = Math.abs(nextCost - previousCost) >= 0.0001;

    if (priceChanged && nextCost > 0) {
      const effectiveFrom = input.priceEffectiveFrom?.trim() || todayIso();
      const { error } = await supabase
        .from("feed_rations")
        .update({ price_per_unit: nextCost, effective_from: effectiveFrom })
        .eq("id", rationId)
        .eq("organization_id", orgId);

      if (error) return { error: formatDbError(error.message) };
      await recordRationPriceHistory(supabase, orgId, user.id, rationId, nextCost, effectiveFrom);
    }

    revalidateFeed();
    revalidatePath(`/feed/rations/${rationId}`);
    return { success: "Ration updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveFeedRation(orgId: string, rationId: string): Promise<FeedActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const { error } = await supabase
      .from("feed_rations")
      .update({ is_active: false })
      .eq("id", rationId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Ration archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function createFeeding(
  orgId: string,
  input: {
    feedRationId: string;
    quantity: number;
    fedAt?: string;
    cattleGroupId?: string;
    locationId?: string;
    ownershipGroupId?: string;
    ownerId?: string;
    headCount?: number;
    fedBy?: string;
    notes?: string;
    feedingContext?: FeedingContext;
    requireLocation?: boolean;
    requireOwner?: boolean;
  },
): Promise<FeedActionState> {
  if (!input.feedRationId) return { error: "Select a feed ration" };
  if (!input.quantity || input.quantity <= 0) return { error: "Enter feed amount" };
  if (input.requireLocation && !input.locationId) {
    return { error: "Select which pen you fed" };
  }
  if (input.requireOwner && !input.ownershipGroupId && !input.ownerId) {
    return { error: "Select who this feed is for" };
  }

  try {
    const { supabase, user } = await requireMember(orgId);
    const fedAt = input.fedAt || todayIso();
    const unitCost = await getRationUnitPriceAtDate(orgId, input.feedRationId, fedAt);
    const totalFeedCost = Math.round(unitCost * input.quantity * 100) / 100;

    const ownerColumns = feedingOwnerColumns({
      ownerId: input.ownerId,
      ownershipGroupId: input.ownershipGroupId,
    });

    const { data, error } = await supabase
      .from("feeding_records")
      .insert({
        organization_id: orgId,
        feed_ration_id: input.feedRationId,
        quantity: input.quantity,
        fed_at: fedAt,
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        ownership_group_id: ownerColumns.ownership_group_id,
        owner_id: ownerColumns.owner_id,
        head_count: input.headCount ?? null,
        fed_by: input.fedBy || user.id,
        notes: input.notes?.trim() || null,
        feeding_context: input.feedingContext ?? "general",
        unit_cost_snapshot: unitCost,
        total_feed_cost: totalFeedCost,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };

    const stock = await syncFeedingStock(
      supabase,
      orgId,
      user.id,
      data.id,
      { rationId: null, quantity: null },
      { rationId: input.feedRationId, quantity: input.quantity },
    );
    if (stock.error) {
      await supabase.from("feeding_records").delete().eq("id", data.id);
      return { error: stock.error };
    }

    revalidateFeed();
    return { success: "Feeding logged", feedingId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateFeeding(
  orgId: string,
  feedingId: string,
  input: {
    feedRationId?: string;
    quantity?: number;
    fedAt?: string;
    cattleGroupId?: string | null;
    locationId?: string | null;
    ownershipGroupId?: string | null;
    ownerId?: string | null;
    headCount?: number | null;
    fedBy?: string | null;
    notes?: string | null;
  },
): Promise<FeedActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("feeding_records")
      .select("feed_ration_id, quantity, fed_at")
      .eq("id", feedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!existing) return { error: "Feeding not found" };

    const nextRationId = input.feedRationId ?? existing.feed_ration_id;
    const nextQty = input.quantity ?? Number(existing.quantity);
    const nextFedAt = input.fedAt ?? existing.fed_at;
    const unitCost = await getRationUnitPriceAtDate(orgId, nextRationId, nextFedAt);
    const totalFeedCost = Math.round(unitCost * nextQty * 100) / 100;

    const stock = await syncFeedingStock(
      supabase,
      orgId,
      user.id,
      feedingId,
      {
        rationId: existing.feed_ration_id,
        quantity: Number(existing.quantity),
      },
      { rationId: nextRationId, quantity: nextQty },
    );
    if (stock.error) return { error: stock.error };

    const updates: FeedingUpdate = {};
    if (input.feedRationId !== undefined) updates.feed_ration_id = input.feedRationId;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.fedAt !== undefined) updates.fed_at = input.fedAt;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.ownershipGroupId !== undefined || input.ownerId !== undefined) {
      const ownerColumns = feedingOwnerColumns({
        ownerId: input.ownerId,
        ownershipGroupId: input.ownershipGroupId,
      });
      updates.ownership_group_id = ownerColumns.ownership_group_id;
      (updates as { owner_id?: string | null }).owner_id = ownerColumns.owner_id;
    }
    if (input.headCount !== undefined) updates.head_count = input.headCount;
    if (input.fedBy !== undefined) updates.fed_by = input.fedBy;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    updates.unit_cost_snapshot = unitCost;
    updates.total_feed_cost = totalFeedCost;

    const { error } = await supabase
      .from("feeding_records")
      .update(updates)
      .eq("id", feedingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    revalidatePath(`/feed/log/${feedingId}`);
    return { success: "Feeding updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveFeeding(orgId: string, feedingId: string): Promise<FeedActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("feeding_records")
      .select("feed_ration_id, quantity")
      .eq("id", feedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (existing) {
      const stock = await syncFeedingStock(
        supabase,
        orgId,
        user.id,
        feedingId,
        {
          rationId: existing.feed_ration_id,
          quantity: Number(existing.quantity),
        },
        { rationId: null, quantity: null },
      );
      if (stock.error) return { error: stock.error };
    }

    const { error } = await supabase
      .from("feeding_records")
      .update({ is_active: false })
      .eq("id", feedingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateFeed();
    return { success: "Feeding archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
