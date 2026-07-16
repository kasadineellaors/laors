import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AlertBannerProps {
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  variant?: "warning" | "critical" | "info";
}

const variantClasses = {
  warning: "border-status-warning/40 bg-status-warning-bg text-text-primary",
  critical: "border-status-critical/40 bg-status-critical-bg text-text-primary",
  info: "border-status-info/30 bg-status-info-bg text-text-primary",
};

export function AlertBanner({
  children,
  href,
  linkLabel,
  variant = "warning",
}: AlertBannerProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border-l-4 px-4 py-3.5 text-sm leading-relaxed",
        variant === "warning" && "border-l-status-warning",
        variant === "critical" && "border-l-status-critical",
        variant === "info" && "border-l-status-info",
        variantClasses[variant],
      )}
      role="status"
    >
      {children}
      {href && linkLabel ? (
        <>
          {" "}
          <Link href={href} className="font-semibold text-navy underline underline-offset-2">
            {linkLabel}
          </Link>
          .
        </>
      ) : null}
    </div>
  );
}
