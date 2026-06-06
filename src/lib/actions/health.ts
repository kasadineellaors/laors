"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import { syncTreatmentMedicineStock } from "@/lib/actions/medicine";

type TreatmentUpdate = Database["public"]["Tables"]["treatment_records"]["Update"];

export type TreatmentActionState = {
  error?: string;
  success?: string;
  treatmentId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE3B.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("treatment_records") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateTreatments() {
  revalidatePath("/health/treatments");
  revalidatePath("/health/medicine");
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

export async function createTreatment(
  orgId: string,
  input: {
    productName: string;
    treatmentType?: string;
    headCount?: number;
    treatmentDate?: string;
    cattleGroupId?: string;
    locationId?: string;
    administeredTo?: string;
    notes?: string;
    medicineItemId?: string;
    quantityUsed?: number;
  },
): Promise<TreatmentActionState> {
  const productName = input.productName.trim();
  if (!productName) return { error: "Product name is required" };
  if (input.medicineItemId && !input.quantityUsed) {
    return { error: "Enter quantity used from inventory" };
  }
  if (input.quantityUsed && !input.medicineItemId) {
    return { error: "Select a medicine from inventory" };
  }

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("treatment_records")
      .insert({
        organization_id: orgId,
        product_name: productName,
        treatment_type: input.treatmentType?.trim() || null,
        head_count: input.headCount ?? null,
        treatment_date: input.treatmentDate || new Date().toISOString().slice(0, 10),
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        administered_by: input.administeredTo || user.id,
        notes: input.notes?.trim() || null,
        medicine_item_id: input.medicineItemId || null,
        quantity_used: input.quantityUsed ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };

    if (input.medicineItemId && input.quantityUsed) {
      const stock = await syncTreatmentMedicineStock(
        supabase,
        orgId,
        user.id,
        data.id,
        { medicineItemId: null, quantityUsed: null },
        { medicineItemId: input.medicineItemId, quantityUsed: input.quantityUsed },
      );
      if (stock.error) {
        await supabase.from("treatment_records").delete().eq("id", data.id);
        return { error: stock.error };
      }
    }

    revalidateTreatments();
    return { success: "Treatment logged", treatmentId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateTreatment(
  orgId: string,
  treatmentId: string,
  input: {
    productName?: string;
    treatmentType?: string | null;
    headCount?: number | null;
    treatmentDate?: string;
    cattleGroupId?: string | null;
    locationId?: string | null;
    administeredTo?: string | null;
    notes?: string | null;
    medicineItemId?: string | null;
    quantityUsed?: number | null;
  },
): Promise<TreatmentActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("treatment_records")
      .select("medicine_item_id, quantity_used")
      .eq("id", treatmentId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!existing) return { error: "Treatment not found" };

    const nextMedicineId =
      input.medicineItemId !== undefined
        ? input.medicineItemId
        : existing.medicine_item_id;
    const nextQty =
      input.quantityUsed !== undefined ? input.quantityUsed : existing.quantity_used;

    if (nextMedicineId && !nextQty) {
      return { error: "Enter quantity used from inventory" };
    }
    if (nextQty && !nextMedicineId) {
      return { error: "Select a medicine from inventory" };
    }

    const updates: TreatmentUpdate = {};
    if (input.productName !== undefined) updates.product_name = input.productName.trim();
    if (input.treatmentType !== undefined) updates.treatment_type = input.treatmentType?.trim() || null;
    if (input.headCount !== undefined) updates.head_count = input.headCount;
    if (input.treatmentDate !== undefined) updates.treatment_date = input.treatmentDate;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.administeredTo !== undefined) updates.administered_by = input.administeredTo;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    if (input.medicineItemId !== undefined) updates.medicine_item_id = input.medicineItemId;
    if (input.quantityUsed !== undefined) updates.quantity_used = input.quantityUsed;

    const stock = await syncTreatmentMedicineStock(
      supabase,
      orgId,
      user.id,
      treatmentId,
      {
        medicineItemId: existing.medicine_item_id,
        quantityUsed: existing.quantity_used ? Number(existing.quantity_used) : null,
      },
      {
        medicineItemId: nextMedicineId,
        quantityUsed: nextQty ? Number(nextQty) : null,
      },
    );
    if (stock.error) return { error: stock.error };

    const { error } = await supabase
      .from("treatment_records")
      .update(updates)
      .eq("id", treatmentId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateTreatments();
    revalidatePath(`/health/treatments/${treatmentId}`);
    return { success: "Treatment updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveTreatment(
  orgId: string,
  treatmentId: string,
): Promise<TreatmentActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("treatment_records")
      .select("medicine_item_id, quantity_used")
      .eq("id", treatmentId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (existing?.medicine_item_id && existing.quantity_used) {
      const stock = await syncTreatmentMedicineStock(
        supabase,
        orgId,
        user.id,
        treatmentId,
        {
          medicineItemId: existing.medicine_item_id,
          quantityUsed: Number(existing.quantity_used),
        },
        { medicineItemId: null, quantityUsed: null },
      );
      if (stock.error) return { error: stock.error };
    }

    const { error } = await supabase
      .from("treatment_records")
      .update({ is_active: false })
      .eq("id", treatmentId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateTreatments();
    return { success: "Treatment archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
