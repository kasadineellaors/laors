import { MetricCard, type MetricTone } from "@/components/ui/metric-card";

export type { MetricTone };

interface DashboardMetricCardProps {
  label: string;
  value: string;
  context?: string;
  tone?: MetricTone;
}

export function DashboardMetricCard({
  label,
  value,
  context,
  tone = "default",
}: DashboardMetricCardProps) {
  return <MetricCard label={label} value={value} context={context} tone={tone} />;
}
