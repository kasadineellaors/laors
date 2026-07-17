"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { syncLotStatusAfterHeadChange } from "@/lib/lots/sync-status";
import { redirect } from "next/navigation";
import {
  buildMoveLinesForTotal,
  getDefaultHeadClassificationId,
} from "@/lib/inventory/default-classification";
import { computeAvgWeightIn } from "@/lib/lots/purchase-weights";
import { listGroupsAtLocation } from "@/lib/inventory/queries";
import { logAuditEvent } from "@/lib/audit/log";
import type { ActionState } from "./onboarding";

const DB_PHASE2_HINT =
  "Run supabase/RUN_PHASE2.sql in Supabase SQL Editor, then retry.";

async function requireOrgAccess(orgId: string) {
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

async function requireAnyMember(orgId: string) {
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

/** Adjust group head count for a sale (any member). headDelta negative = sold, positive = restore. */
export async function applySaleHeadDelta(
  orgId: string,
  groupId: string,
  headDelta: number,
  notes?: string,
): Promise<ActionState> {
  if (headDelta === 0) return { success: "No change" };

  try {
    const { supabase, user } = await requireAnyMember(orgId);
    const defaultClassId = await getDefaultHeadClassificationId(orgId);

    const { data: existingRows } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId);

    const previous = (existingRows ?? []).reduce((s, r) => s + r.head_count, 0);
    const newCount = previous + headDelta;

    if (newCount < 0) {
      return { error: `Not enough head in group (have ${previous}, sale is ${-headDelta})` };
    }

    await supabase.from("group_inventory_counts").delete().eq("cattle_group_id", groupId);

    if (newCount > 0) {
      const { error } = await supabase.from("group_inventory_counts").insert({
        organization_id: orgId,
        cattle_group_id: groupId,
        classification_id: defaultClassId,
        head_count: newCount,
      });
      if (error) return { error: error.message };
    }

    await supabase.from("inventory_adjustments").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      classification_id: defaultClassId,
      previous_count: previous,
      new_count: newCount,
      delta: headDelta,
      notes: notes?.trim() || null,
      created_by: user.id,
    });

    await syncLotStatusAfterHeadChange(supabase, orgId, groupId, newCount);

    revalidateInventory();
    revalidatePath(`/cattle/groups/${groupId}`);
    revalidatePath(`/cattle/groups/${groupId}/closeout`);
    return { success: "Head count updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

function revalidateInventory() {
  revalidatePath("/cattle");
  revalidatePath("/cattle/move");
  revalidatePath("/cattle/moves");
  revalidatePath("/cow-calf");
  revalidatePath("/dashboard");
  revalidatePath("/setup/locations");
}

/** Add or remove head for a specific classification within a group. */
export async function applyClassificationHeadDelta(
  orgId: string,
  groupId: string,
  classificationId: string,
  delta: number,
  notes?: string,
): Promise<ActionState> {
  if (delta === 0) return { success: "No change" };

  try {
    const { supabase, user } = await requireOrgAccess(orgId);

    const { data: existing } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId)
      .eq("classification_id", classificationId)
      .maybeSingle();

    const previous = existing?.head_count ?? 0;
    const newCount = previous + delta;
    if (newCount < 0) {
      return { error: `Not enough head in classification (have ${previous})` };
    }

    if (newCount === 0) {
      await supabase
        .from("group_inventory_counts")
        .delete()
        .eq("cattle_group_id", groupId)
        .eq("classification_id", classificationId);
    } else if (existing) {
      const { error } = await supabase
        .from("group_inventory_counts")
        .update({ head_count: newCount })
        .eq("cattle_group_id", groupId)
        .eq("classification_id", classificationId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("group_inventory_counts").insert({
        organization_id: orgId,
        cattle_group_id: groupId,
        classification_id: classificationId,
        head_count: newCount,
      });
      if (error) return { error: error.message };
    }

    await supabase.from("inventory_adjustments").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      classification_id: classificationId,
      previous_count: previous,
      new_count: newCount,
      delta,
      notes: notes?.trim() || null,
      created_by: user.id,
    });

    revalidateInventory();
    return { success: "Head count updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

function formatDbError(message: string): string {
  if (
    message.includes("execute_cattle_move") ||
    message.includes("void_cattle_move") ||
    message.includes("cattle_movements") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_PHASE2_HINT}`;
  }
  return message;
}

export async function createCattleGroup(
  orgId: string,
  input: {
    name: string;
    locationId: string;
    headCount: number;
    notes?: string;
    ownershipGroupId?: string;
    customerId?: string;
    ownerId?: string;
    lotNumber?: string;
    enterpriseType?: string;
    purchaseDate?: string;
    arrivalDate?: string;
    payWeightLbs?: number;
    shrunkWeightLbs?: number;
    receivedWeightLbs?: number;
    purchasePricePerLb?: number;
    landedCost?: number;
    sellerName?: string;
    sourceName?: string;
  },
): Promise<ActionState & { groupId?: string }> {
  try {
    const { supabase, user } = await requireOrgAccess(orgId);
    const trimmed = input.name.trim();
    if (!trimmed) return { error: "Group name is required" };
    if (input.headCount <= 0) return { error: "Enter a head count greater than zero" };

    const defaultClassId = await getDefaultHeadClassificationId(orgId);
    const avgWeight = computeAvgWeightIn(input.headCount, {
      payWeightLbs: input.payWeightLbs,
      shrunkWeightLbs: input.shrunkWeightLbs,
      receivedWeightLbs: input.receivedWeightLbs,
    });

    const { data: group, error: groupError } = await supabase
      .from("cattle_groups")
      .insert({
        organization_id: orgId,
        name: trimmed,
        location_id: input.locationId,
        ownership_group_id: input.ownershipGroupId || input.ownerId || null,
        customer_id: input.customerId || input.ownerId || null,
        owner_id: input.ownerId || input.customerId || input.ownershipGroupId || null,
        notes: input.notes?.trim() || null,
        lot_number: input.lotNumber?.trim() || null,
        enterprise_type: input.enterpriseType || "stocker",
        lot_status: "receiving",
        opened_at: input.arrivalDate || input.purchaseDate || new Date().toISOString().slice(0, 10),
        purchase_date: input.purchaseDate || null,
        arrival_date: input.arrivalDate || null,
        starting_head: input.headCount,
        pay_weight_lbs: input.payWeightLbs ?? null,
        shrunk_weight_lbs: input.shrunkWeightLbs ?? null,
        received_weight_lbs: input.receivedWeightLbs ?? null,
        avg_weight_lbs: avgWeight,
        purchase_price_per_lb: input.purchasePricePerLb ?? null,
        landed_cost: input.landedCost ?? null,
        seller_name: input.sellerName?.trim() || null,
        source_name: input.sourceName?.trim() || null,
      })
      .select("id")
      .single();

    if (groupError || !group) {
      return { error: groupError?.message ?? "Failed to create group" };
    }

    const { error } = await supabase.from("group_inventory_counts").insert({
      organization_id: orgId,
      cattle_group_id: group.id,
      classification_id: defaultClassId,
      head_count: input.headCount,
    });
    if (error) return { error: error.message };

    await logAuditEvent(orgId, {
      action: "lot.received",
      tableName: "cattle_groups",
      recordId: group.id,
      userId: user.id,
      newData: {
        lot_label: input.lotNumber?.trim() || trimmed,
        head_count: input.headCount,
      },
    });

    revalidateInventory();
    return { success: "Group created", groupId: group.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateCattleGroup(
  orgId: string,
  groupId: string,
  data: {
    name?: string;
    notes?: string | null;
    ownershipGroupId?: string | null;
    customerId?: string | null;
    ownerId?: string | null;
    lotNumber?: string | null;
    enterpriseType?: string;
    lotStatus?: string;
    purchaseDate?: string | null;
    arrivalDate?: string | null;
    payWeightLbs?: number | null;
    shrunkWeightLbs?: number | null;
    receivedWeightLbs?: number | null;
    purchasePricePerLb?: number | null;
    landedCost?: number | null;
    sellerName?: string | null;
    sourceName?: string | null;
  },
): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const updates: {
      name?: string;
      notes?: string | null;
      ownership_group_id?: string | null;
      customer_id?: string | null;
      lot_number?: string | null;
      enterprise_type?: string;
      lot_status?: string;
      purchase_date?: string | null;
      arrival_date?: string | null;
      pay_weight_lbs?: number | null;
      shrunk_weight_lbs?: number | null;
      received_weight_lbs?: number | null;
      purchase_price_per_lb?: number | null;
      landed_cost?: number | null;
      seller_name?: string | null;
      source_name?: string | null;
      avg_weight_lbs?: number | null;
    } = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;
    if (data.ownershipGroupId !== undefined) {
      updates.ownership_group_id = data.ownershipGroupId;
    }
    if (data.customerId !== undefined) {
      updates.customer_id = data.customerId;
    }
    if (data.ownerId !== undefined) {
      (updates as { owner_id?: string | null }).owner_id = data.ownerId;
      if (data.ownerId) {
        updates.customer_id = data.ownerId;
        updates.ownership_group_id = data.ownerId;
      }
    }
    if (data.lotNumber !== undefined) updates.lot_number = data.lotNumber?.trim() || null;
    if (data.enterpriseType !== undefined) updates.enterprise_type = data.enterpriseType;
    if (data.lotStatus !== undefined) updates.lot_status = data.lotStatus;
    if (data.purchaseDate !== undefined) updates.purchase_date = data.purchaseDate;
    if (data.arrivalDate !== undefined) updates.arrival_date = data.arrivalDate;
    if (data.payWeightLbs !== undefined) updates.pay_weight_lbs = data.payWeightLbs;
    if (data.shrunkWeightLbs !== undefined) updates.shrunk_weight_lbs = data.shrunkWeightLbs;
    if (data.receivedWeightLbs !== undefined) updates.received_weight_lbs = data.receivedWeightLbs;
    if (data.purchasePricePerLb !== undefined) {
      updates.purchase_price_per_lb = data.purchasePricePerLb;
    }
    if (data.landedCost !== undefined) updates.landed_cost = data.landedCost;
    if (data.sellerName !== undefined) updates.seller_name = data.sellerName?.trim() || null;
    if (data.sourceName !== undefined) updates.source_name = data.sourceName?.trim() || null;

    const weightFieldsTouched =
      data.payWeightLbs !== undefined ||
      data.shrunkWeightLbs !== undefined ||
      data.receivedWeightLbs !== undefined;

    if (weightFieldsTouched) {
      const { data: existing } = await supabase
        .from("cattle_groups")
        .select("starting_head, pay_weight_lbs, shrunk_weight_lbs, received_weight_lbs")
        .eq("id", groupId)
        .eq("organization_id", orgId)
        .maybeSingle();

      const headCount = existing?.starting_head ?? 0;
      updates.avg_weight_lbs = computeAvgWeightIn(headCount, {
        payWeightLbs:
          data.payWeightLbs !== undefined ? data.payWeightLbs : existing?.pay_weight_lbs,
        shrunkWeightLbs:
          data.shrunkWeightLbs !== undefined
            ? data.shrunkWeightLbs
            : existing?.shrunk_weight_lbs,
        receivedWeightLbs:
          data.receivedWeightLbs !== undefined
            ? data.receivedWeightLbs
            : existing?.received_weight_lbs,
      });
    }

    const { error } = await supabase
      .from("cattle_groups")
      .update(updates)
      .eq("id", groupId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateInventory();
    return { success: "Group updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function setGroupHeadCount(
  orgId: string,
  groupId: string,
  newCount: number,
  adjustmentReasonId?: string,
  notes?: string,
): Promise<ActionState> {
  if (newCount < 0) return { error: "Count cannot be negative" };

  try {
    const { supabase, user } = await requireOrgAccess(orgId);
    const defaultClassId = await getDefaultHeadClassificationId(orgId);

    const { data: existingRows } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId);

    const previous = (existingRows ?? []).reduce((s, r) => s + r.head_count, 0);
    const delta = newCount - previous;

    if (delta === 0) return { success: "No change" };

    await supabase.from("group_inventory_counts").delete().eq("cattle_group_id", groupId);

    if (newCount > 0) {
      const { error } = await supabase.from("group_inventory_counts").insert({
        organization_id: orgId,
        cattle_group_id: groupId,
        classification_id: defaultClassId,
        head_count: newCount,
      });
      if (error) return { error: error.message };
    }

    await supabase.from("inventory_adjustments").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      classification_id: defaultClassId,
      adjustment_reason_id: adjustmentReasonId ?? null,
      previous_count: previous,
      new_count: newCount,
      delta,
      notes: notes?.trim() || null,
      created_by: user.id,
    });

    revalidateInventory();
    return { success: "Head count updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function receiveCattleToLot(
  orgId: string,
  groupId: string,
  input: {
    headCount: number;
    purchaseDate?: string;
    payWeightLbs?: number;
    receivedWeightLbs?: number;
    purchasePricePerLb?: number;
    landedCost?: number;
    sellerName?: string;
    sourceName?: string;
    notes?: string;
  },
): Promise<ActionState> {
  if (input.headCount <= 0) return { error: "Enter a head count greater than zero" };

  try {
    const { supabase, user } = await requireOrgAccess(orgId);

    const { data: group, error: groupError } = await supabase
      .from("cattle_groups")
      .select(
        "id, name, lot_number, lot_status, starting_head, pay_weight_lbs, received_weight_lbs, landed_cost, purchase_date, arrival_date",
      )
      .eq("id", groupId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (groupError || !group) return { error: groupError?.message ?? "Lot not found" };
    if (group.lot_status === "closed") return { error: "This lot is closed — reopen or create a new lot" };

    const defaultClassId = await getDefaultHeadClassificationId(orgId);

    const { data: purchasedReason } = await supabase
      .from("adjustment_reasons")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", "Purchased")
      .eq("is_active", true)
      .maybeSingle();

    const { data: existingRows } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId);

    const previous = (existingRows ?? []).reduce((sum, row) => sum + row.head_count, 0);
    const newCount = previous + input.headCount;

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

    const nextStartingHead = (group.starting_head ?? previous) + input.headCount;
    const nextPayWeight =
      input.payWeightLbs != null
        ? (group.pay_weight_lbs ?? 0) + input.payWeightLbs
        : group.pay_weight_lbs;
    const nextReceivedWeight =
      input.receivedWeightLbs != null
        ? (group.received_weight_lbs ?? 0) + input.receivedWeightLbs
        : group.received_weight_lbs;
    const nextLandedCost =
      input.landedCost != null
        ? (group.landed_cost ?? 0) + input.landedCost
        : group.landed_cost;

    const avgWeight = computeAvgWeightIn(nextStartingHead, {
      payWeightLbs: nextPayWeight,
      receivedWeightLbs: nextReceivedWeight,
    });

    const groupUpdates: {
      starting_head: number;
      pay_weight_lbs: number | null;
      received_weight_lbs: number | null;
      landed_cost: number | null;
      avg_weight_lbs: number | null;
      purchase_date?: string;
      arrival_date?: string;
      seller_name?: string;
      source_name?: string;
      lot_status?: string;
    } = {
      starting_head: nextStartingHead,
      pay_weight_lbs: nextPayWeight,
      received_weight_lbs: nextReceivedWeight,
      landed_cost: nextLandedCost,
      avg_weight_lbs: avgWeight,
    };

    if (input.purchaseDate) {
      if (!group.purchase_date) groupUpdates.purchase_date = input.purchaseDate;
      if (!group.arrival_date) groupUpdates.arrival_date = input.purchaseDate;
    }
    if (input.sellerName?.trim()) groupUpdates.seller_name = input.sellerName.trim();
    if (input.sourceName?.trim()) groupUpdates.source_name = input.sourceName.trim();
    if (group.lot_status === "receiving" && newCount > 0) {
      groupUpdates.lot_status = "active";
    }

    const { error: updateError } = await supabase
      .from("cattle_groups")
      .update(groupUpdates)
      .eq("id", groupId)
      .eq("organization_id", orgId);

    if (updateError) return { error: updateError.message };

    await supabase.from("inventory_adjustments").insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      classification_id: defaultClassId,
      adjustment_reason_id: purchasedReason?.id ?? null,
      previous_count: previous,
      new_count: newCount,
      delta: input.headCount,
      notes: input.notes?.trim() || "Received cattle to existing lot",
      created_by: user.id,
    });

    await syncLotStatusAfterHeadChange(supabase, orgId, groupId, newCount);

    await logAuditEvent(orgId, {
      action: "lot.received",
      tableName: "cattle_groups",
      recordId: groupId,
      userId: user.id,
      newData: {
        lot_label: group.lot_number || group.name,
        head_count: input.headCount,
        receive_to_existing: true,
      },
    });

    revalidateInventory();
    revalidatePath(`/cattle/groups/${groupId}`);
    return { success: `Received ${input.headCount} head to lot` };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function executeCattleMove(
  orgId: string,
  input: {
    sourceGroupId: string;
    destinationLocationId: string;
    destinationGroupId?: string;
    movementReasonId?: string;
    notes?: string;
    headToMove: number;
  },
): Promise<ActionState & { movementId?: string }> {
  if (input.headToMove <= 0) return { error: "Enter how many head to move" };

  try {
    const { supabase } = await requireOrgAccess(orgId);
    const lines = await buildMoveLinesForTotal(orgId, input.sourceGroupId, input.headToMove);
    if (!lines.length) return { error: "No head available to move" };

    const payload = {
      source_group_id: input.sourceGroupId,
      destination_location_id: input.destinationLocationId,
      destination_group_id: input.destinationGroupId ?? "",
      movement_reason_id: input.movementReasonId ?? "",
      notes: input.notes ?? "",
      lines,
    };

    const { data: movementId, error } = await supabase.rpc("execute_cattle_move", {
      p_payload: payload,
    });

    if (error) return { error: formatDbError(error.message) };
    revalidateInventory();
    return { success: "Move recorded", movementId: movementId as string };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function voidCattleMove(orgId: string, movementId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const { error } = await supabase.rpc("void_cattle_move", {
      p_movement_id: movementId,
    });
    if (error) return { error: formatDbError(error.message) };
    revalidateInventory();
    return { success: "Move voided — counts restored" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function updateMovementNotes(
  orgId: string,
  movementId: string,
  notes: string,
  movementReasonId?: string | null,
): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const { error } = await supabase
      .from("cattle_movements")
      .update({
        notes: notes.trim() || null,
        movement_reason_id: movementReasonId ?? null,
      })
      .eq("id", movementId)
      .eq("organization_id", orgId)
      .eq("status", "completed");

    if (error) return { error: formatDbError(error.message) };
    revalidateInventory();
    return { success: "Move updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function archiveCattleGroup(orgId: string, groupId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);

    const { data: counts } = await supabase
      .from("group_inventory_counts")
      .select("head_count")
      .eq("cattle_group_id", groupId);

    const total = (counts ?? []).reduce((s, c) => s + c.head_count, 0);
    if (total > 0) {
      return { error: "Move or zero out all head before archiving this group" };
    }

    const { error } = await supabase
      .from("cattle_groups")
      .update({ is_active: false })
      .eq("id", groupId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateInventory();
    return { success: "Group archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function fetchGroupsAtLocation(orgId: string, locationId: string) {
  return listGroupsAtLocation(orgId, locationId);
}

export async function goToMoveCattle(sourceGroupId?: string) {
  if (sourceGroupId) {
    redirect(`/cattle/move?from=${sourceGroupId}`);
  }
  redirect("/cattle/move");
}
