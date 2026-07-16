import { cn } from "@/lib/utils/cn";

interface MetricProps {
  value: string;
  label: string;
  warning?: boolean;
}

function CompactMetric({ value, label, warning }: MetricProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-3 shadow-[var(--shadow-card)]">
      <p
        className={cn(
          "text-xl font-bold tabular-nums leading-tight",
          warning ? "text-status-warning" : "text-navy",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface FeedSummaryMetricsProps {
  feedingsToday: number;
  amountFedThisWeek: number;
  feedCostThisWeek: number;
  lowStockCount: number;
  className?: string;
}

export function FeedSummaryMetrics({
  feedingsToday,
  amountFedThisWeek,
  feedCostThisWeek,
  lowStockCount,
  className,
}: FeedSummaryMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <CompactMetric value={String(feedingsToday)} label="Feedings today" />
      <CompactMetric
        value={amountFedThisWeek.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        label="Amount fed this week"
      />
      <CompactMetric value={formatCurrency(feedCostThisWeek)} label="Feed cost this week" />
      <CompactMetric
        value={String(lowStockCount)}
        label={lowStockCount === 1 ? "Low-stock item" : "Low-stock items"}
        warning={lowStockCount > 0}
      />
    </div>
  );
}
