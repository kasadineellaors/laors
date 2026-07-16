import Link from "next/link";
import {
  formatAuditAction,
  summarizeAuditEntry,
  type AuditLogEntry,
} from "@/lib/audit/queries";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuditLogListProps {
  entries: AuditLogEntry[];
}

export function AuditLogList({ entries }: AuditLogListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No activity yet</CardTitle>
          <CardDescription>
            Cattle moves, lot receives, sales, and closeout emails will appear here as your team
            works.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Owners and managers only · newest first</CardDescription>
      </CardHeader>
      <ul className="divide-y divide-border px-4 pb-4">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-semibold text-charcoal">{formatAuditAction(entry.action)}</p>
              <p className="text-charcoal/70">{summarizeAuditEntry(entry)}</p>
              <p className="mt-1 text-xs text-charcoal/50">
                {entry.user_name ?? "System"}
                {" · "}
                {formatWhen(entry.created_at)}
              </p>
            </div>
            {recordHref(entry) ? (
              <Link href={recordHref(entry)!} className="shrink-0 text-xs font-semibold text-olive hover:underline">
                View
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function recordHref(entry: AuditLogEntry): string | null {
  const data = (entry.new_data ?? {}) as Record<string, unknown>;
  if (entry.table_name === "cattle_groups" && entry.record_id) {
    return `/cattle/groups/${entry.record_id}`;
  }
  if (entry.table_name === "sales_records" && entry.record_id) {
    return `/sales/${entry.record_id}`;
  }
  if (entry.table_name === "cattle_movements" && entry.record_id) {
    return "/cattle/moves";
  }
  if (entry.action === "closeout.emailed" && typeof data.group_id === "string") {
    return `/cattle/groups/${data.group_id}/closeout`;
  }
  return null;
}
