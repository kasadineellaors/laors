import Link from "next/link";
import type { AuditLogEntry } from "@/lib/audit/queries";
import { formatAuditAction, summarizeAuditEntry } from "@/lib/audit/queries";
import { formatRelativeTime } from "@/lib/dashboard/relative-time";

interface RecentActivityCardProps {
  entries: AuditLogEntry[];
}

export function RecentActivityCard({ entries }: RecentActivityCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Recent Activity</h2>
          <p className="mt-0.5 text-sm text-text-secondary">Latest ranch events</p>
        </div>
        <Link
          href="/setup/audit"
          className="shrink-0 text-sm font-semibold text-slate underline underline-offset-2 hover:text-navy"
        >
          View all
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">No recent activity logged yet.</p>
      ) : (
        <ul className="divide-y divide-border-neutral">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatAuditAction(entry.action)}
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">{summarizeAuditEntry(entry)}</p>
                  {entry.user_name ? (
                    <p className="mt-0.5 text-xs text-text-secondary">{entry.user_name}</p>
                  ) : null}
                </div>
                <time
                  className="shrink-0 text-xs text-text-secondary"
                  dateTime={entry.created_at}
                >
                  {formatRelativeTime(entry.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
