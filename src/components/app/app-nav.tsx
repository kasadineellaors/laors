"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_NAV = [
  { href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard" },
  { href: "/cattle", label: "Cattle", match: (p: string) => p.startsWith("/cattle") },
  { href: "/jobs", label: "Jobs", match: (p: string) => p.startsWith("/jobs") },
  { href: "/health", label: "Health", match: (p: string) => p.startsWith("/health") },
  { href: "/time", label: "Time", match: (p: string) => p.startsWith("/time") },
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
    p.startsWith("/weather"),
} as const;

function navClass(active: boolean) {
  return active
    ? "flex min-h-11 flex-col items-center justify-center rounded-lg px-2 text-[11px] font-bold text-olive bg-olive/10"
    : "flex min-h-11 flex-col items-center justify-center rounded-lg px-2 text-[11px] font-semibold text-charcoal/70 hover:bg-tan-light/50 hover:text-olive";
}

interface AppNavProps {
  calendarEnabled?: boolean;
}

export function AppNav({ calendarEnabled = false }: AppNavProps) {
  const pathname = usePathname();
  const navItems = calendarEnabled
    ? [...BASE_NAV, CALENDAR_NAV, MORE_NAV]
    : [...BASE_NAV, MORE_NAV];

  return (
    <nav className="sticky bottom-0 border-t border-border bg-surface px-1 py-2 safe-area-pb">
      <div className="mx-auto flex max-w-5xl justify-around gap-0.5">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} className={navClass(active)}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
