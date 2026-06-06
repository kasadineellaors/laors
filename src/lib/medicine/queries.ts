import { createClient } from "@/lib/supabase/server";
import type { MedicineItemRecord, MedicineOption, MedicineStockAdjustment } from "./types";

export async function listMedicineItems(orgId: string): Promise<MedicineItemRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("medicine_items")
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
    price_per_cc: r.price_per_cc != null ? Number(r.price_per_cc) : null,
    reorder_at: r.reorder_at != null ? Number(r.reorder_at) : null,
    notes: r.notes,
    is_low_stock:
      r.reorder_at != null && Number(r.quantity_on_hand) <= Number(r.reorder_at),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getMedicineItem(
  orgId: string,
  itemId: string,
): Promise<MedicineItemRecord | null> {
  const items = await listMedicineItems(orgId);
  return items.find((i) => i.id === itemId) ?? null;
}

export async function listMedicineOptions(orgId: string): Promise<MedicineOption[]> {
  const items = await listMedicineItems(orgId);
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    quantity_on_hand: i.quantity_on_hand,
    price_per_cc: i.price_per_cc,
  }));
}

export async function listMedicineAdjustments(
  orgId: string,
  itemId: string,
  limit = 20,
): Promise<MedicineStockAdjustment[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("medicine_stock_adjustments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("medicine_item_id", itemId)
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
    medicine_item_id: r.medicine_item_id,
    previous_quantity: Number(r.previous_quantity),
    new_quantity: Number(r.new_quantity),
    delta: Number(r.delta),
    adjustment_type: r.adjustment_type as MedicineStockAdjustment["adjustment_type"],
    notes: r.notes,
    created_by_name: r.created_by ? names.get(r.created_by) ?? null : null,
    created_at: r.created_at,
  }));
}

export async function countLowStockItems(orgId: string): Promise<number> {
  const items = await listMedicineItems(orgId);
  return items.filter((i) => i.is_low_stock).length;
}
