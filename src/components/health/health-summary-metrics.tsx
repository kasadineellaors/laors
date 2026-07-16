import { cn } from "@/lib/utils/cn";

interface MetricProps {
  value: string;
  label: string;
  warning?: boolean;
  critical?: boolean;
}

function CompactMetric({ value, label, warning, critical }: MetricProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-3 shadow-[var(--shadow-card)]">
      <p
        className={cn(
          "text-xl font-bold tabular-nums leading-tight",
          critical ? "text-status-critical" : warning ? "text-status-warning" : "text-navy",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}

interface HealthSummaryMetricsProps {
  treatmentsThisMonth: number;
  headTreatedThisMonth: number;
  activeWithdrawals: number;
  lowStockMedicines: number;
  hasWithdrawalData: boolean;
  className?: string;
}

export function HealthSummaryMetrics({
  treatmentsThisMonth,
  headTreatedThisMonth,
  activeWithdrawals,
  lowStockMedicines,
  hasWithdrawalData,
  className,
}: HealthSummaryMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <CompactMetric value={String(treatmentsThisMonth)} label="Treatments this month" />
      <CompactMetric value={headTreatedThisMonth.toLocaleString()} label="Head treated" />
      {hasWithdrawalData ? (
        <CompactMetric
          value={String(activeWithdrawals)}
          label={activeWithdrawals === 1 ? "Active withdrawal" : "Active withdrawals"}
          warning={activeWithdrawals > 0}
        />
      ) : (
        <CompactMetric value="—" label="Active withdrawals" />
      )}
      <CompactMetric
        value={String(lowStockMedicines)}
        label={lowStockMedicines === 1 ? "Low-stock medicine" : "Low-stock medicines"}
        warning={lowStockMedicines > 0}
      />
    </div>
  );
}
