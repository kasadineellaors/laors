import Link from "next/link";
import type { EnterpriseHeadRow } from "@/lib/dashboard/queries";

interface HeadByEnterpriseCardProps {
  rows: EnterpriseHeadRow[];
}

export function HeadByEnterpriseCard({ rows }: HeadByEnterpriseCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">Head by Enterprise</h2>
        <p className="mt-0.5 text-sm text-text-secondary">Open lots only</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">No open lots with head.</p>
      ) : (
        <ul className="divide-y divide-border-neutral">
          {rows.map((row) => (
            <li
              key={row.enterprise_type}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium text-text-primary">{row.label}</span>
              <span className="text-right text-xs text-slate">
                {row.lot_count} lot{row.lot_count === 1 ? "" : "s"}
              </span>
              <span className="text-right text-lg font-bold tabular-nums text-navy">
                {row.head}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link
          href="/reports/enterprise"
          className="text-sm font-semibold text-slate underline underline-offset-2 hover:text-navy"
        >
          Enterprise P&amp;L
        </Link>
      </div>
    </section>
  );
}
