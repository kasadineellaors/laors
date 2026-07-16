"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const BASE_NAV = [
  { href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard" },
  { href: "/cattle", label: "Cattle", match: (p: string) => p.startsWith("/cattle") },
  { href: "/feed", label: "Feed", match: (p: string) => p.startsWith("/feed") },
  { href: "/health", label: "Health", match: (p: string) => p.startsWith("/health") },
  { href: "/jobs", label: "Jobs", match: (p: string) => p.startsWith("/jobs") },
] as const;

const CALENDAR_NAV = {
  href: "/calendar",
  label: "Calendar",
  match: (p: string) => p.startsWith("/calendar"),
} as const;

const MORE_NAV = {
  href: "/setup",
  label: "More",
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
}

export function AppNav({ calendarEnabled = false }: AppNavProps) {
  const pathname = usePathname();
  const navItems = calendarEnabled
    ? [...BASE_NAV, CALENDAR_NAV, MORE_NAV]
    : [...BASE_NAV, MORE_NAV];

  return (
    <nav className="safe-area-pb border-t border-border-neutral bg-surface-white px-1 py-2">
      <div className="mx-auto flex max-w-6xl justify-around gap-0.5">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
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
