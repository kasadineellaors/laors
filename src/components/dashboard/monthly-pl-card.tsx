import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface MonthlyPlCardProps {
  monthLabel: string;
  saleRevenue: number;
  operatingCosts: number;
  netPl: number;
  headReceived: number;
  headSold: number;
}

function PlRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-muted/60 px-3 py-2.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          highlight === "positive" && "text-status-success",
          highlight === "negative" && "text-status-critical",
          (!highlight || highlight === "neutral") && "text-navy",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function MonthlyPlCard({
  monthLabel,
  saleRevenue,
  operatingCosts,
  netPl,
  headReceived,
  headSold,
}: MonthlyPlCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-navy">This Month</h2>
        <p className="mt-0.5 text-sm text-text-secondary">{monthLabel} operating snapshot</p>
      </div>

      <div className="space-y-2">
        <PlRow label="Sale revenue" value={money(saleRevenue)} />
        <PlRow label="Operating costs" value={money(operatingCosts)} />
        <PlRow
          label="Net P&amp;L"
          value={money(netPl)}
          highlight={netPl >= 0 ? "positive" : "negative"}
        />
        <PlRow label="Head received" value={String(headReceived)} />
        <PlRow label="Head sold" value={String(headSold)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/reports/pl">
          <Button variant="primary" size="sm" fullWidth>
            Full P&amp;L
          </Button>
        </Link>
        <Link href="/reports/monthly">
          <Button variant="outline" size="sm" fullWidth>
            Operations
          </Button>
        </Link>
      </div>
    </section>
  );
}
