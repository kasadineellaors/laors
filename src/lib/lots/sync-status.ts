import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AnySupabase = SupabaseClient<Database>;

/** Update lot_status after inventory changes from sales or deaths. */
export async function syncLotStatusAfterHeadChange(
  supabase: AnySupabase,
  orgId: string,
  groupId: string,
  currentHead: number,
): Promise<void> {
  const { data: group } = await supabase
    .from("cattle_groups")
    .select("lot_status")
    .eq("id", groupId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!group || group.lot_status === "closed") return;

  const { data: sales } = await supabase
    .from("sales_records")
    .select("head_count")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .eq("inventory_deducted", true);

  const headsSold = (sales ?? []).reduce((s, r) => s + (r.head_count ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  let nextStatus: string | null = null;
  let closedAt: string | null | undefined = undefined;

  if (currentHead <= 0 && headsSold > 0) {
    nextStatus = "closed";
    closedAt = today;
  } else if (currentHead > 0 && headsSold > 0) {
    nextStatus = "partially_sold";
    closedAt = null;
  } else if (currentHead > 0 && headsSold === 0 && group.lot_status === "receiving") {
    nextStatus = "active";
  }

  if (!nextStatus || nextStatus === group.lot_status) return;

  const updates: { lot_status: string; closed_at?: string | null } = {
    lot_status: nextStatus,
  };
  if (closedAt !== undefined) updates.closed_at = closedAt;

  await supabase
    .from("cattle_groups")
    .update(updates)
    .eq("id", groupId)
    .eq("organization_id", orgId);
}
