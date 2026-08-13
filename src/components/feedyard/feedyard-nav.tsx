"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const FEEDYARD_NAV_ITEMS = [
  { href: "/feedyard", label: "Overview", exact: true },
  { href: "/cattle", label: "Lots" },
  { href: "/feed", label: "Feed" },
  { href: "/reports/owner-totals", label: "Owner Totals" },
  { href: "/invoices", label: "Billing" },
] as const;

export function FeedyardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Feedyard"
      className="flex gap-1 overflow-x-auto border-b border-border-neutral pb-1"
    >
      {FEEDYARD_NAV_ITEMS.map((item) => {
        const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-navy text-white"
                : "text-text-secondary hover:bg-tan/30 hover:text-navy",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
