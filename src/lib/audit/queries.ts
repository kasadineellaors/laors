import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type AuditLogEntry = {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  "cattle.move": "Cattle move",
  "cattle.move.void": "Move voided",
  "lot.received": "Lot received",
  "lot.closed": "Lot closed",
  "closeout.emailed": "Closeout emailed",
  "closeout.share_created": "Closeout share link created",
  "sale.recorded": "Sale recorded",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}

export function summarizeAuditEntry(entry: AuditLogEntry): string {
  const data = (entry.new_data ?? {}) as Record<string, unknown>;

  switch (entry.action) {
    case "cattle.move":
      return `${data.total_head ?? "?"} head moved`;
    case "cattle.move.void":
      return "Move reversed";
    case "lot.received":
      return `${data.lot_label ?? "Lot"} · ${data.head_count ?? "?"} hd`;
    case "lot.closed":
      return String(data.lot_label ?? "Lot closed");
    case "closeout.emailed":
      return `Sent to ${data.email ?? "customer"}`;
    case "closeout.share_created":
      return String(data.lot_label ?? "Share link created");
    case "sale.recorded":
      return `${data.head_count ?? "?"} hd · ${data.buyer ?? "Sale"}`;
    default:
      if (entry.record_id) return `Record ${entry.record_id.slice(0, 8)}…`;
      return entry.table_name.replace(/_/g, " ");
  }
}

export async function listAuditLog(orgId: string, limit = 100): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("id, action, table_name, record_id, old_data, new_data, created_at, user_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    table_name: row.table_name,
    record_id: row.record_id,
    old_data: row.old_data,
    new_data: row.new_data,
    created_at: row.created_at,
    user_id: row.user_id,
    user_name: row.user_id ? names.get(row.user_id) ?? null : null,
  }));
}
