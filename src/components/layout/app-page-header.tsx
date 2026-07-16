import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

const backLinkClass =
  "text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2";

export function AppPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  className,
}: AppPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div>
        {backHref && backLabel ? (
          <Link href={backHref} className={backLinkClass}>
            ← {backLabel}
          </Link>
        ) : null}
        <h1
          className={cn(
            "text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]",
            backHref ? "mt-1" : undefined,
          )}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
