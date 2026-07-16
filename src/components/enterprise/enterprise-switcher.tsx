"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  activeEnterpriseFromPath,
  ENTERPRISE_OVERVIEW_HREFS,
  ENTERPRISE_UI_LABELS,
  type EnterpriseUiContext,
} from "@/lib/enterprise/ui";
import { cn } from "@/lib/utils/cn";

interface EnterpriseSwitcherProps {
  showStocker: boolean;
  showCowCalf: boolean;
}

const TAB_ORDER: Array<Exclude<EnterpriseUiContext, "ranch" | "seedstock">> = [
  "stocker",
  "cow_calf",
];

export function EnterpriseSwitcher({ showStocker, showCowCalf }: EnterpriseSwitcherProps) {
  const pathname = usePathname();
  const active = activeEnterpriseFromPath(pathname);

  const tabs = TAB_ORDER.filter((key) => {
    if (key === "stocker") return showStocker;
    if (key === "cow_calf") return showCowCalf;
    return false;
  });

  if (tabs.length < 2) return null;

  return (
    <div
      className="border-b border-border-neutral bg-surface-white"
      role="navigation"
      aria-label="Enterprise"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <span className="hidden text-xs font-semibold uppercase tracking-wide text-text-secondary sm:inline">
          Enterprise
        </span>
        <div className="flex gap-1 rounded-[var(--radius-button)] bg-tan/20 p-1">
          {tabs.map((key) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={ENTERPRISE_OVERVIEW_HREFS[key]}
                className={cn(
                  "min-h-9 rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                  isActive
                    ? "bg-navy text-surface-white"
                    : "text-navy hover:bg-surface-white/80",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {ENTERPRISE_UI_LABELS[key]}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
