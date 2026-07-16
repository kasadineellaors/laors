import Link from "next/link";
import type { EnterpriseHeadRow } from "@/lib/dashboard/queries";
import { Button } from "@/components/ui/button";

interface EnterpriseSummaryCardProps {
  enterprises: EnterpriseHeadRow[];
}

export function EnterpriseSummaryCard({ enterprises }: EnterpriseSummaryCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">Enterprise Summary</h2>
        <p className="mt-0.5 text-sm text-text-secondary">Open lots by enterprise</p>
      </div>

      {enterprises.length === 0 ? (
        <p className="text-sm text-text-secondary">No open lots with head count.</p>
      ) : (
        <ul className="divide-y divide-border-neutral">
          {enterprises.map((row) => (
            <li key={row.enterprise_type} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-semibold text-text-primary">{row.label}</p>
                <p className="text-xs text-text-secondary">
                  {row.lot_count} open lot{row.lot_count === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-navy">
                {row.head}
                <span className="ml-1 text-sm font-medium text-text-secondary">hd</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link href="/reports/enterprise">
          <Button variant="outline" size="sm" fullWidth>
            Enterprise P&amp;L
          </Button>
        </Link>
      </div>
    </section>
  );
}
