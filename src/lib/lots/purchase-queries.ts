import { createClient } from "@/lib/supabase/server";
import type { LotPurchaseRecord } from "./purchase-types";

export async function listLotPurchases(
  orgId: string,
  groupId: string,
  limit = 50,
): Promise<LotPurchaseRecord[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("cattle_group_purchases")
    .select("*")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .order("purchased_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    if (error?.message.includes("cattle_group_purchases")) return [];
    return [];
  }

  return rows.map(mapLotPurchase);
}

function mapLotPurchase(row: Record<string, unknown>): LotPurchaseRecord {
  return {
    id: row.id as string,
    cattle_group_id: row.cattle_group_id as string,
    purchased_at: row.purchased_at as string,
    arrival_date: (row.arrival_date as string | null) ?? null,
    seller_name: (row.seller_name as string | null) ?? null,
    source_name: (row.source_name as string | null) ?? null,
    invoice_ref: (row.invoice_ref as string | null) ?? null,
    head_count: Number(row.head_count),
    pay_weight_lbs:
      row.pay_weight_lbs != null ? Number(row.pay_weight_lbs) : null,
    received_weight_lbs:
      row.received_weight_lbs != null ? Number(row.received_weight_lbs) : null,
    purchase_price_per_lb:
      row.purchase_price_per_lb != null ? Number(row.purchase_price_per_lb) : null,
    landed_cost: row.landed_cost != null ? Number(row.landed_cost) : null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
  };
}
