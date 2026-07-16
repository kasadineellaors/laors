import { cn } from "@/lib/utils/cn";

export type MetricTone = "default" | "warning" | "critical" | "success";

interface DashboardMetricCardProps {
  label: string;
  value: string;
  context?: string;
  tone?: MetricTone;
}

const toneClasses: Record<MetricTone, string> = {
  default: "text-navy",
  warning: "text-status-warning",
  critical: "text-status-critical",
  success: "text-status-success",
};

export function DashboardMetricCard({
  label,
  value,
  context,
  tone = "default",
}: DashboardMetricCardProps) {
  return (
    <div className="flex min-h-[108px] flex-col justify-center rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-5 py-4 shadow-[var(--shadow-card)]">
      <p className={cn("text-2xl font-bold tabular-nums leading-tight", toneClasses[tone])}>
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">{label}</p>
      {context ? <p className="mt-0.5 text-xs text-text-secondary">{context}</p> : null}
    </div>
  );
}
