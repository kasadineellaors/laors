import { cn } from "@/lib/utils/cn";

interface MedicineSummaryMetricsProps {
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  className?: string;
}

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

export function MedicineSummaryMetrics({
  activeProducts,
  lowStock,
  outOfStock,
  className,
}: MedicineSummaryMetricsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-3", className)}>
      <Metric value={String(activeProducts)} label="Active products" />
      <Metric value={String(lowStock)} label="Low stock" warning={lowStock > 0} />
      <Metric
        value={String(outOfStock)}
        label="Out of stock"
        critical={outOfStock > 0}
        warning={outOfStock === 0 && lowStock > 0}
      />
    </div>
  );
}
