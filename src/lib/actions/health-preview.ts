"use server";

import { createClient } from "@/lib/supabase/server";
import { formatMedicineUnit } from "@/lib/health/display";

export interface MedicineStockPreview {
  ok: boolean;
  onHand: number;
  unit: string;
  remainingAfter: number | null;
  message: string | null;
}

export async function previewTreatmentMedicineUse(
  orgId: string,
  medicineItemId: string,
  quantityUsed: number,
): Promise<MedicineStockPreview> {
  if (!medicineItemId || quantityUsed <= 0) {
    return { ok: true, onHand: 0, unit: "dose", remainingAfter: null, message: null };
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("medicine_items")
    .select("quantity_on_hand, unit")
    .eq("id", medicineItemId)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .maybeSingle();

  if (!item) {
    return {
      ok: false,
      onHand: 0,
      unit: "dose",
      remainingAfter: null,
      message: "Medicine not found in inventory",
    };
  }

  const onHand = Number(item.quantity_on_hand);
  const unit = formatMedicineUnit(item.unit);
  const remaining = onHand - quantityUsed;

  if (remaining < 0) {
    return {
      ok: false,
      onHand,
      unit,
      remainingAfter: remaining,
      message: `Requested ${quantityUsed} ${unit} exceeds ${onHand} ${unit} on hand`,
    };
  }

  return {
    ok: true,
    onHand,
    unit,
    remainingAfter: remaining,
    message: null,
  };
}
