import { cn } from "@/lib/utils/cn";

interface MetricProps {
  value: string;
  label: string;
}

function CompactMetric({ value, label }: MetricProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-xl font-bold tabular-nums leading-tight text-navy">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}

interface CattleSummaryMetricsProps {
  totalHead: number;
  openLots: number;
  closedLots: number;
  unassignedHead?: number;
  className?: string;
}

export function CattleSummaryMetrics({
  totalHead,
  openLots,
  closedLots,
  unassignedHead,
  className,
}: CattleSummaryMetricsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        unassignedHead != null && unassignedHead > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      <CompactMetric value={totalHead.toLocaleString()} label="Total head" />
      <CompactMetric value={String(openLots)} label={openLots === 1 ? "Open lot" : "Open lots"} />
      <CompactMetric
        value={String(closedLots)}
        label={closedLots === 1 ? "Closed lot" : "Closed lots"}
      />
      {unassignedHead != null && unassignedHead > 0 ? (
        <CompactMetric value={unassignedHead.toLocaleString()} label="Unassigned head" />
      ) : null}
    </div>
  );
}
