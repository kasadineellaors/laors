"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { weightedAverageCost } from "@/lib/medicine/costing";
import type { Database } from "@/types/database";
import type { MedicineAdjustmentType } from "@/lib/medicine/types";

type MedicineUpdate = Database["public"]["Tables"]["medicine_items"]["Update"];

export type MedicineActionState = {
  error?: string;
  success?: string;
  itemId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE3C.sql (or RUN_PHASE6.sql for catalog pricing) in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (
    message.includes("medicine_items") ||
    message.includes("medicine_stock") ||
    message.includes("schema cache")
  ) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateMedicine() {
  revalidatePath("/health");
  revalidatePath("/health/medicine");
  revalidatePath("/health/treatments");
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

export async function applyMedicineDelta(
  supabase: SupabaseClient<Database>,
  orgId: string,
  userId: string,
  medicineItemId: string,
  delta: number,
  adjustmentType: MedicineAdjustmentType,
  options?: { treatmentRecordId?: string; notes?: string; unitCost?: number },
): Promise<{ error?: string }> {
  const { data: item, error: fetchError } = await supabase
    .from("medicine_items")
    .select("quantity_on_hand, price_per_cc, avg_unit_cost")
    .eq("id", medicineItemId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError) return { error: formatDbError(fetchError.message) };
  if (!item) return { error: "Medicine item not found" };

  const previous = Number(item.quantity_on_hand);
  const newQty = previous + delta;
  if (newQty < 0) return { error: "Not enough medicine on hand" };

  const itemRow = item as {
    quantity_on_hand: number;
    price_per_cc: number | null;
    avg_unit_cost?: number | null;
  };
  const currentAvg =
    itemRow.avg_unit_cost != null
      ? Number(itemRow.avg_unit_cost)
      : itemRow.price_per_cc != null
        ? Number(itemRow.price_per_cc)
        : null;

  let nextAvg = currentAvg;
  if (adjustmentType === "receive" && delta > 0 && options?.unitCost != null) {
    nextAvg = weightedAverageCost(previous, currentAvg, delta, options.unitCost);
  }

  const itemUpdates: Database["public"]["Tables"]["medicine_items"]["Update"] = {
    quantity_on_hand: newQty,
  };
  if (nextAvg != null && adjustmentType === "receive" && delta > 0 && options?.unitCost != null) {
    itemUpdates.avg_unit_cost = nextAvg;
    itemUpdates.price_per_cc = nextAvg;
  }

  const { error: updateError } = await supabase
    .from("medicine_items")
    .update(itemUpdates)
    .eq("id", medicineItemId)
    .eq("organization_id", orgId);

  if (updateError) return { error: formatDbError(updateError.message) };

  const { error: adjError } = await supabase.from("medicine_stock_adjustments").insert({
    organization_id: orgId,
    medicine_item_id: medicineItemId,
    previous_quantity: previous,
    new_quantity: newQty,
    delta,
    adjustment_type: adjustmentType,
    treatment_record_id: options?.treatmentRecordId ?? null,
    notes: options?.notes?.trim() || null,
    unit_cost: options?.unitCost ?? null,
    created_by: userId,
  });

  if (adjError) return { error: formatDbError(adjError.message) };
  return {};
}

export async function createMedicineItem(
  orgId: string,
  input: {
    name: string;
    unit?: string;
    quantityOnHand?: number;
    reorderAt?: number;
    pricePerCc?: number;
    withdrawalDays?: number | null;
    notes?: string;
  },
): Promise<MedicineActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  try {
    const { supabase } = await requireMember(orgId);
    const qty = input.quantityOnHand ?? 0;
    if (qty < 0) return { error: "Quantity cannot be negative" };

    const { data, error } = await supabase
      .from("medicine_items")
      .insert({
        organization_id: orgId,
        name,
        unit: input.unit?.trim() || "dose",
        quantity_on_hand: qty,
        reorder_at: input.reorderAt ?? null,
        price_per_cc: input.pricePerCc ?? null,
        withdrawal_days: input.withdrawalDays ?? null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateMedicine();
    return { success: "Medicine added", itemId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateMedicineItem(
  orgId: string,
  itemId: string,
  input: {
    name?: string;
    unit?: string;
    reorderAt?: number | null;
    pricePerCc?: number | null;
    withdrawalDays?: number | null;
    notes?: string | null;
  },
): Promise<MedicineActionState> {
  try {
    const { supabase } = await requireMember(orgId);

    const updates: MedicineUpdate = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.unit !== undefined) updates.unit = input.unit.trim() || "dose";
    if (input.reorderAt !== undefined) updates.reorder_at = input.reorderAt;
    if (input.pricePerCc !== undefined) updates.price_per_cc = input.pricePerCc;
    if (input.withdrawalDays !== undefined) {
      (updates as { withdrawal_days?: number | null }).withdrawal_days = input.withdrawalDays;
    }
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase
      .from("medicine_items")
      .update(updates)
      .eq("id", itemId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateMedicine();
    revalidatePath(`/health/medicine/${itemId}`);
    return { success: "Medicine updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function adjustMedicineStock(
  orgId: string,
  itemId: string,
  input: {
    newQuantity?: number;
    delta?: number;
    adjustmentType: MedicineAdjustmentType;
    notes?: string;
    totalCost?: number;
  },
): Promise<MedicineActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    const unitCost =
      input.adjustmentType === "receive" &&
      input.totalCost != null &&
      input.delta != null &&
      input.delta > 0
        ? input.totalCost / input.delta
        : undefined;

    if (input.newQuantity !== undefined) {
      const { data: item } = await supabase
        .from("medicine_items")
        .select("quantity_on_hand")
        .eq("id", itemId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!item) return { error: "Medicine item not found" };
      const previous = Number(item.quantity_on_hand);
      const delta = input.newQuantity - previous;
      if (input.newQuantity < 0) return { error: "Quantity cannot be negative" };

      const result = await applyMedicineDelta(
        supabase,
        orgId,
        user.id,
        itemId,
        delta,
        input.adjustmentType,
        { notes: input.notes, unitCost: delta > 0 ? unitCost : undefined },
      );
      if (result.error) return { error: result.error };
    } else if (input.delta !== undefined) {
      const result = await applyMedicineDelta(
        supabase,
        orgId,
        user.id,
        itemId,
        input.delta,
        input.adjustmentType,
        { notes: input.notes, unitCost },
      );
      if (result.error) return { error: result.error };
    } else {
      return { error: "Provide new quantity or delta" };
    }

    revalidateMedicine();
    revalidatePath(`/health/medicine/${itemId}`);
    return { success: "Stock updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveMedicineItem(
  orgId: string,
  itemId: string,
): Promise<MedicineActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("medicine_items")
      .update({ is_active: false })
      .eq("id", itemId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateMedicine();
    return { success: "Medicine archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function syncTreatmentMedicineStock(
  supabase: SupabaseClient<Database>,
  orgId: string,
  userId: string,
  treatmentId: string,
  previous: { medicineItemId: string | null; quantityUsed: number | null },
  next: { medicineItemId: string | null; quantityUsed: number | null },
): Promise<{ error?: string }> {
  if (
    previous.medicineItemId === next.medicineItemId &&
    previous.quantityUsed === next.quantityUsed
  ) {
    return {};
  }

  if (previous.medicineItemId && previous.quantityUsed) {
    const restore = await applyMedicineDelta(
      supabase,
      orgId,
      userId,
      previous.medicineItemId,
      previous.quantityUsed,
      "adjust",
      { treatmentRecordId: treatmentId, notes: "Treatment edit — stock restored" },
    );
    if (restore.error) return restore;
  }

  if (next.medicineItemId && next.quantityUsed) {
    const deduct = await applyMedicineDelta(
      supabase,
      orgId,
      userId,
      next.medicineItemId,
      -next.quantityUsed,
      "treatment",
      { treatmentRecordId: treatmentId, notes: "Used on treatment" },
    );
    if (deduct.error) return deduct;
  }

  return {};
}
