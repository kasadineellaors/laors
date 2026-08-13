import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateLotPurchases } from "@/lib/lots/purchase-rollups";
import type { LotPurchaseRecord } from "@/lib/lots/purchase-types";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

const DB_HINT = "Run supabase/RUN_PHASE41.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("cattle_group_purchases") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function mapPurchaseRow(row: Record<string, unknown>): LotPurchaseRecord {
  return {
    id: row.id as string,
    cattle_group_id: row.cattle_group_id as string,
    purchased_at: row.purchased_at as string,
    arrival_date: (row.arrival_date as string | null) ?? null,
    seller_name: (row.seller_name as string | null) ?? null,
    source_name: (row.source_name as string | null) ?? null,
    invoice_ref: (row.invoice_ref as string | null) ?? null,
    head_count: Number(row.head_count),
    pay_weight_lbs: row.pay_weight_lbs != null ? Number(row.pay_weight_lbs) : null,
    received_weight_lbs:
      row.received_weight_lbs != null ? Number(row.received_weight_lbs) : null,
    purchase_price_per_lb:
      row.purchase_price_per_lb != null ? Number(row.purchase_price_per_lb) : null,
    landed_cost: row.landed_cost != null ? Number(row.landed_cost) : null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

/** Recompute cattle_groups purchase rollups from active purchase receipts. */
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

  const purchases = (rows ?? []).map((row) => mapPurchaseRow(row as Record<string, unknown>));
  const rollup = aggregateLotPurchases(purchases);

  const { data: existingGroup } = await supabase
    .from("cattle_groups")
    .select("current_avg_weight_lbs")
    .eq("id", groupId)
    .eq("organization_id", orgId)
    .maybeSingle();

  const liveWeight = existingGroup?.current_avg_weight_lbs;
  const updates = {
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
    ...(rollup.avg_weight_lbs != null &&
    (liveWeight == null || Number(liveWeight) <= 0)
      ? { current_avg_weight_lbs: rollup.avg_weight_lbs }
      : {}),
  };

  const { error } = await supabase
    .from("cattle_groups")
    .update(updates)
    .eq("id", groupId)
    .eq("organization_id", orgId);

  if (error) return { error: formatDbError(error.message) };
  return {};
}
