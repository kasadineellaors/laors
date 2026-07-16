"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  cattleNavHref,
  cattleNavIsActive,
} from "@/lib/enterprise/ui";
import type { OperationMode } from "@/types/auth";
import { cn } from "@/lib/utils/cn";

const BASE_NAV = [
  { key: "home", href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard" },
  {
    key: "cattle",
    label: "Cattle",
    match: cattleNavIsActive,
    hrefFor: (p: string, modes: OperationMode[]) => cattleNavHref(p, modes),
  },
  { key: "feed", href: "/feed", label: "Feed", match: (p: string) => p.startsWith("/feed") },
  { key: "health", href: "/health", label: "Health", match: (p: string) => p.startsWith("/health") },
  { key: "jobs", href: "/jobs", label: "Jobs", match: (p: string) => p.startsWith("/jobs") },
] as const;

const CALENDAR_NAV = {
  key: "calendar",
  href: "/calendar",
  label: "Calendar",
  match: (p: string) => p.startsWith("/calendar"),
} as const;

const MORE_NAV = {
  key: "manage",
  href: "/setup",
  label: "Manage",
  match: (p: string) =>
    p.startsWith("/setup") ||
    p.startsWith("/sales") ||
    p.startsWith("/invoices") ||
    p.startsWith("/reports") ||
    p.startsWith("/time") ||
    p.startsWith("/weather"),
} as const;

interface AppNavProps {
  calendarEnabled?: boolean;
  enabledModes?: OperationMode[];
}

export function AppNav({ calendarEnabled = false, enabledModes = [] }: AppNavProps) {
  const pathname = usePathname();
  const modes = enabledModes;
  const navItems = calendarEnabled
    ? [...BASE_NAV, CALENDAR_NAV, MORE_NAV]
    : [...BASE_NAV, MORE_NAV];

  return (
    <nav
      className="safe-area-pb border-t border-border-neutral bg-surface-white px-1 py-2"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-6xl justify-around gap-0.5">
        {navItems.map((item) => {
          const href =
            "hrefFor" in item ? item.hrefFor(pathname, modes) : item.href;
          const active = item.match(pathname);
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "flex min-h-11 min-w-[3rem] flex-col items-center justify-center rounded-lg px-2 text-[11px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                active
                  ? "font-bold text-brown"
                  : "text-navy hover:bg-tan/30 hover:text-navy-dark",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "mb-0.5 h-0.5 w-5 rounded-full",
                  active ? "bg-brown" : "bg-transparent",
                )}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
