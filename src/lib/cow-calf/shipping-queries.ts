import { createClient } from "@/lib/supabase/server";
import {
  SHIPPING_DIRECTION_LABELS,
  SHIPPING_REASON_LABELS,
  type ShippingDirection,
  type ShippingReason,
} from "@/lib/cow-calf/shipping-constants";

export interface CowCalfShippingRecord {
  id: string;
  shipped_at: string;
  direction: ShippingDirection;
  head_count: number;
  weight_lbs: number | null;
  cow_calf_herd_id: string | null;
  cattle_group_id: string | null;
  source_name: string | null;
  destination_name: string | null;
  reason: ShippingReason;
  notes: string | null;
  herd_name: string | null;
  lot_name: string | null;
}

export async function listCowCalfShipping(orgId: string): Promise<CowCalfShippingRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cow_calf_shipping_records")
    .select(
      "id, shipped_at, direction, head_count, weight_lbs, cow_calf_herd_id, cattle_group_id, source_name, destination_name, reason, notes",
    )
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("shipped_at", { ascending: false })
    .limit(200);

  if (error) {
    if (error.message.includes("cow_calf_shipping_records")) return [];
    throw error;
  }

  const herdIds = [...new Set((data ?? []).map((r) => r.cow_calf_herd_id).filter(Boolean))] as string[];
  const lotIds = [...new Set((data ?? []).map((r) => r.cattle_group_id).filter(Boolean))] as string[];

  const [{ data: herds }, { data: lots }] = await Promise.all([
    herdIds.length
      ? supabase.from("cow_calf_herds").select("id, name").in("id", herdIds)
      : Promise.resolve({ data: [] }),
    lotIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", lotIds)
      : Promise.resolve({ data: [] }),
  ]);

  const herdName = new Map((herds ?? []).map((h) => [h.id, h.name]));
  const lotName = new Map((lots ?? []).map((l) => [l.id, l.name]));

  return (data ?? []).map((row) => ({
    ...row,
    direction: row.direction as ShippingDirection,
    reason: row.reason as ShippingReason,
    weight_lbs: row.weight_lbs != null ? Number(row.weight_lbs) : null,
    herd_name: row.cow_calf_herd_id ? (herdName.get(row.cow_calf_herd_id) ?? null) : null,
    lot_name: row.cattle_group_id ? (lotName.get(row.cattle_group_id) ?? null) : null,
  }));
}

export function formatShippingLabel(
  direction: ShippingDirection,
  reason: ShippingReason,
  headCount: number,
): string {
  return `${SHIPPING_DIRECTION_LABELS[direction]} · ${headCount} hd · ${SHIPPING_REASON_LABELS[reason]}`;
}
