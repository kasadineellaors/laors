import type { EnterpriseUiContext } from "@/lib/enterprise/ui";
import { ENTERPRISE_UI_LABELS } from "@/lib/enterprise/ui";
import { cn } from "@/lib/utils/cn";

interface EnterpriseBadgeProps {
  enterprise: EnterpriseUiContext;
  className?: string;
}

const variantClasses: Record<EnterpriseUiContext, string> = {
  stocker: "bg-status-info-bg text-status-info",
  cow_calf: "bg-tan/40 text-navy",
  seedstock: "bg-status-success-bg text-status-success",
  ranch: "bg-surface-muted text-text-secondary",
};

export function EnterpriseBadge({ enterprise, className }: EnterpriseBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        variantClasses[enterprise],
        className,
      )}
    >
      {ENTERPRISE_UI_LABELS[enterprise]}
    </span>
  );
}
