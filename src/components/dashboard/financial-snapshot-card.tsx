import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface FinancialSnapshotCardProps {
  rainfall: number;
  headSold: number;
  salesRevenue: number;
  openInvoices?: number;
  outstanding?: number;
  showInvoices: boolean;
}

function SnapshotRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-tan/20/60 px-3 py-2.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "warning" ? "text-status-warning" : "text-navy",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function FinancialSnapshotCard({
  rainfall,
  headSold,
  salesRevenue,
  openInvoices,
  outstanding,
  showInvoices,
}: FinancialSnapshotCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">Last 30 Days</h2>
        <p className="mt-0.5 text-sm text-text-secondary">Rainfall and sales at a glance</p>
      </div>

      <div className="space-y-2">
        <SnapshotRow label="Rainfall" value={`${rainfall}"`} />
        <SnapshotRow label="Head sold" value={String(headSold)} />
        <SnapshotRow label="Sales revenue" value={money(salesRevenue)} />
        {showInvoices && openInvoices != null ? (
          <SnapshotRow label="Open invoices" value={String(openInvoices)} />
        ) : null}
        {showInvoices && outstanding != null ? (
          <SnapshotRow
            label="Outstanding"
            value={money(outstanding)}
            tone={outstanding > 0 ? "warning" : "default"}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/reports" className="flex-1">
          <Button variant="primary" size="sm" fullWidth>
            View Reports
          </Button>
        </Link>
        <Link href="/weather/rainfall" className="flex-1">
          <Button variant="outline" size="sm" fullWidth>
            Rainfall
          </Button>
        </Link>
        <Link href="/sales" className="flex-1">
          <Button variant="outline" size="sm" fullWidth>
            Sales
          </Button>
        </Link>
        {showInvoices ? (
          <Link href="/invoices" className="flex-1">
            <Button variant="outline" size="sm" fullWidth>
              Invoices
            </Button>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
