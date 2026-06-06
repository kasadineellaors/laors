"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildMoveLinesForTotal,
  getDefaultHeadClassificationId,
} from "@/lib/inventory/default-classification";
import { listGroupsAtLocation } from "@/lib/inventory/queries";
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

    revalidateInventory();
    return { success: "Head count updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

function revalidateInventory() {
  revalidatePath("/cattle");
  revalidatePath("/cattle/move");
  revalidatePath("/cattle/moves");
  revalidatePath("/dashboard");
  revalidatePath("/setup/locations");
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
  name: string,
  locationId: string,
  headCount: number,
  notes?: string,
  ownershipGroupId?: string,
  customerId?: string,
): Promise<ActionState & { groupId?: string }> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const trimmed = name.trim();
    if (!trimmed) return { error: "Group name is required" };
    if (headCount <= 0) return { error: "Enter a head count greater than zero" };

    const defaultClassId = await getDefaultHeadClassificationId(orgId);

    const { data: group, error: groupError } = await supabase
      .from("cattle_groups")
      .insert({
        organization_id: orgId,
        name: trimmed,
        location_id: locationId,
        ownership_group_id: ownershipGroupId || null,
        customer_id: customerId || null,
        notes: notes?.trim() || null,
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
      head_count: headCount,
    });
    if (error) return { error: error.message };

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
  },
): Promise<ActionState> {
  try {
    const { supabase } = await requireOrgAccess(orgId);
    const updates: {
      name?: string;
      notes?: string | null;
      ownership_group_id?: string | null;
      customer_id?: string | null;
    } = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;
    if (data.ownershipGroupId !== undefined) {
      updates.ownership_group_id = data.ownershipGroupId;
    }
    if (data.customerId !== undefined) {
      updates.customer_id = data.customerId;
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
