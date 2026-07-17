"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDefaultHeadClassificationId } from "@/lib/inventory/default-classification";
import { aggregateLotPurchases } from "@/lib/lots/purchase-rollups";
import type { LotPurchaseInput } from "@/lib/lots/purchase-types";
import type { Database } from "@/types/database";
import type { ActionState } from "./onboarding";

const DB_HINT = "Run supabase/RUN_PHASE41.sql in Supabase SQL Editor, then retry.";

type Supabase = SupabaseClient<Database>;

export type LotPurchaseActionState = ActionState & { purchaseId?: string };

function formatDbError(message: string): string {
  if (message.includes("cattle_group_purchases") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateLot(groupId: string) {
  revalidatePath("/cattle");
  revalidatePath(`/cattle/groups/${groupId}`);
}

async function requireManager(orgId: string) {
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

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }

  return { supabase, user };
}

function normalizePurchaseInput(input: LotPurchaseInput) {
  const payWeight = input.payWeightLbs;
  const price = input.purchasePricePerLb;
  const landed =
    input.landedCost ??
    (payWeight != null && price != null ? payWeight * price : undefined);

  return {
    purchased_at: input.purchasedAt || new Date().toISOString().slice(0, 10),
    arrival_date: input.arrivalDate || input.purchasedAt || null,
    seller_name: input.sellerName?.trim() || null,
    source_name: input.sourceName?.trim() || null,
    invoice_ref: input.invoiceRef?.trim() || null,
    head_count: input.headCount,
    pay_weight_lbs: payWeight ?? null,
    received_weight_lbs: input.receivedWeightLbs ?? null,
    purchase_price_per_lb: price ?? null,
    landed_cost: landed ?? null,
    notes: input.notes?.trim() || null,
  };
}

export async function syncLotPurchaseRollups(
  supabase: Supabase,
  orgId: string,
  groupId: string,
): Promise<{ error?: string }> {
  const { data: rows, error: fetchError } = await supabase
    .from("cattle_group_purchases")
    .select("*")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true);

  if (fetchError) return { error: formatDbError(fetchError.message) };

  const purchases = (rows ?? []).map((row) => ({
    id: row.id,
    cattle_group_id: row.cattle_group_id,
    purchased_at: row.purchased_at,
    arrival_date: row.arrival_date,
    seller_name: row.seller_name,
    source_name: row.source_name,
    invoice_ref: row.invoice_ref,
    head_count: Number(row.head_count),
    pay_weight_lbs: row.pay_weight_lbs != null ? Number(row.pay_weight_lbs) : null,
    received_weight_lbs:
      row.received_weight_lbs != null ? Number(row.received_weight_lbs) : null,
    purchase_price_per_lb:
      row.purchase_price_per_lb != null ? Number(row.purchase_price_per_lb) : null,
    landed_cost: row.landed_cost != null ? Number(row.landed_cost) : null,
    notes: row.notes,
    created_at: row.created_at,
  }));

  const rollup = aggregateLotPurchases(purchases);

  const { error } = await supabase
    .from("cattle_groups")
    .update({
      starting_head: rollup.starting_head,
      pay_weight_lbs: rollup.pay_weight_lbs,
      received_weight_lbs: rollup.received_weight_lbs,
      landed_cost: rollup.landed_cost,
      purchase_date: rollup.purchase_date,
      arrival_date: rollup.arrival_date,
      seller_name: rollup.seller_name,
      source_name: rollup.source_name,
      purchase_price_per_lb: rollup.purchase_price_per_lb,
      avg_weight_lbs: rollup.avg_weight_lbs,
    })
    .eq("id", groupId)
    .eq("organization_id", orgId);

  if (error) return { error: formatDbError(error.message) };
  return {};
}

export async function insertLotPurchase(
  supabase: Supabase,
  orgId: string,
  userId: string,
  groupId: string,
  input: LotPurchaseInput,
  options?: { inventoryAdjustmentId?: string },
): Promise<{ error?: string; purchaseId?: string }> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter a head count greater than zero" };
  }

  const row = normalizePurchaseInput(input);

  const { data, error } = await supabase
    .from("cattle_group_purchases")
    .insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      ...row,
      inventory_adjustment_id: options?.inventoryAdjustmentId ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: formatDbError(error.message) };

  const sync = await syncLotPurchaseRollups(supabase, orgId, groupId);
  if (sync.error) return sync;

  return { purchaseId: data.id };
}

export async function updateLotPurchase(
  orgId: string,
  groupId: string,
  purchaseId: string,
  input: LotPurchaseInput,
): Promise<LotPurchaseActionState> {
  if (!input.headCount || input.headCount <= 0) {
    return { error: "Enter a head count greater than zero" };
  }

  try {
    const { supabase } = await requireManager(orgId);

    const { data: existing, error: fetchError } = await supabase
      .from("cattle_group_purchases")
      .select("id, head_count")
      .eq("id", purchaseId)
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true)
      .maybeSingle();

    if (fetchError) return { error: formatDbError(fetchError.message) };
    if (!existing) return { error: "Purchase receipt not found" };

    const headDelta = input.headCount - existing.head_count;
    if (headDelta !== 0) {
      const { data: counts } = await supabase
        .from("group_inventory_counts")
        .select("head_count")
        .eq("cattle_group_id", groupId);

      const currentHead = (counts ?? []).reduce((sum, row) => sum + row.head_count, 0);
      if (currentHead + headDelta < 0) {
        return { error: "Cannot reduce head below zero on this lot" };
      }

      const defaultClassId = await getDefaultHeadClassificationId(orgId);
      await supabase.from("group_inventory_counts").delete().eq("cattle_group_id", groupId);
      const newCount = currentHead + headDelta;
      if (newCount > 0) {
        const { error: countError } = await supabase.from("group_inventory_counts").insert({
          organization_id: orgId,
          cattle_group_id: groupId,
          classification_id: defaultClassId,
          head_count: newCount,
        });
        if (countError) return { error: countError.message };
      }
    }

    const row = normalizePurchaseInput(input);
    const { error: updateError } = await supabase
      .from("cattle_group_purchases")
      .update(row)
      .eq("id", purchaseId)
      .eq("organization_id", orgId);

    if (updateError) return { error: formatDbError(updateError.message) };

    const sync = await syncLotPurchaseRollups(supabase, orgId, groupId);
    if (sync.error) return { error: sync.error };

    revalidateLot(groupId);
    return { success: "Purchase updated", purchaseId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveLotPurchase(
  orgId: string,
  groupId: string,
  purchaseId: string,
): Promise<LotPurchaseActionState> {
  try {
    const { supabase } = await requireManager(orgId);

    const { data: purchase, error: fetchError } = await supabase
      .from("cattle_group_purchases")
      .select("id, head_count")
      .eq("id", purchaseId)
      .eq("organization_id", orgId)
      .eq("cattle_group_id", groupId)
      .eq("is_active", true)
      .maybeSingle();

    if (fetchError) return { error: formatDbError(fetchError.message) };
    if (!purchase) return { error: "Purchase receipt not found" };

    const { data: counts } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId);

    const currentHead = (counts ?? []).reduce((sum, row) => sum + row.head_count, 0);
    if (currentHead - purchase.head_count < 0) {
      return { error: "Cannot remove receipt — not enough head on the lot" };
    }

    const defaultClassId = await getDefaultHeadClassificationId(orgId);
    const newCount = currentHead - purchase.head_count;
    await supabase.from("group_inventory_counts").delete().eq("cattle_group_id", groupId);
    if (newCount > 0) {
      const { error: countError } = await supabase.from("group_inventory_counts").insert({
        organization_id: orgId,
        cattle_group_id: groupId,
        classification_id: defaultClassId,
        head_count: newCount,
      });
      if (countError) return { error: countError.message };
    }

    const { error: archiveError } = await supabase
      .from("cattle_group_purchases")
      .update({ is_active: false })
      .eq("id", purchaseId)
      .eq("organization_id", orgId);

    if (archiveError) return { error: formatDbError(archiveError.message) };

    const sync = await syncLotPurchaseRollups(supabase, orgId, groupId);
    if (sync.error) return { error: sync.error };

    revalidateLot(groupId);
    return { success: "Purchase removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
