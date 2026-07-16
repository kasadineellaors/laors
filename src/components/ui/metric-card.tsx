import { cn } from "@/lib/utils/cn";

export type MetricTone = "default" | "warning" | "critical" | "success";

interface MetricCardProps {
  label: string;
  value: string;
  context?: string;
  tone?: MetricTone;
  /** Centered layout for overview grids (cow-calf style). */
  centered?: boolean;
  className?: string;
}

const toneClasses: Record<MetricTone, string> = {
  default: "text-navy",
  warning: "text-status-warning",
  critical: "text-status-critical",
  success: "text-status-success",
};

export function MetricCard({
  label,
  value,
  context,
  tone = "default",
  centered = false,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border-neutral bg-surface-white shadow-[var(--shadow-card)]",
        centered ? "px-3 py-4 text-center" : "flex min-h-[108px] flex-col justify-center px-5 py-4",
        className,
      )}
    >
      <p
        className={cn(
          "text-2xl font-bold tabular-nums leading-tight",
          toneClasses[tone],
          centered && "text-brown",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 font-medium text-text-primary",
          centered ? "text-xs text-text-secondary" : "text-sm",
        )}
      >
        {label}
      </p>
      {context ? (
        <p className={cn("mt-0.5 text-xs text-text-secondary", centered && "mt-1")}>{context}</p>
      ) : null}
    </div>
  );
}
