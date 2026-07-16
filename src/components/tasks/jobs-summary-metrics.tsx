import { cn } from "@/lib/utils/cn";
import type { JobsSummary } from "@/lib/tasks/summary";

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

interface JobsSummaryMetricsProps {
  summary: JobsSummary;
  className?: string;
}

export function JobsSummaryMetrics({ summary, className }: JobsSummaryMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <CompactMetric
        value={String(summary.overdue)}
        label={summary.overdue === 1 ? "Overdue" : "Overdue"}
        critical={summary.overdue > 0}
      />
      <CompactMetric
        value={String(summary.dueToday)}
        label={summary.dueToday === 1 ? "Due today" : "Due today"}
        warning={summary.dueToday > 0}
      />
      <CompactMetric value={String(summary.open)} label="Open" />
      <CompactMetric
        value={String(summary.unassigned)}
        label="Unassigned"
        warning={summary.unassigned > 0}
      />
    </div>
  );
}
