import { cn } from "@/lib/utils/cn";
import type { CalendarSummary } from "@/lib/calendar/summary";

function Metric({
  value,
  label,
  warning,
  critical,
}: {
  value: string;
  label: string;
  warning?: boolean;
  critical?: boolean;
}) {
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

interface CalendarSummaryMetricsProps {
  summary: CalendarSummary;
  className?: string;
}

export function CalendarSummaryMetrics({ summary, className }: CalendarSummaryMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <Metric value={String(summary.today)} label="Today" warning={summary.today > 0} />
      <Metric value={String(summary.next7Days)} label="Next 7 days" />
      <Metric
        value={String(summary.overdueJobs)}
        label={summary.overdueJobs === 1 ? "Overdue job" : "Overdue jobs"}
        critical={summary.overdueJobs > 0}
      />
      <Metric value={String(summary.livestockDates)} label="Livestock dates" />
    </div>
  );
}
