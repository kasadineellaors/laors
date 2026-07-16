import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-border-neutral bg-surface-white px-5 py-8 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      {children}
      {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionHref && actionLabel ? (
            <Link href={actionHref}>
              <Button size="md">{actionLabel}</Button>
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref}>
              <Button variant="outline" size="md">
                {secondaryLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
