"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COW_CALF_NAV_ITEMS } from "@/lib/cow-calf/statuses";

export function CowCalfEnterpriseNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Cow-Calf enterprise"
      className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto pb-1"
    >
      {COW_CALF_NAV_ITEMS.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
              active
                ? "bg-navy text-surface-white"
                : "bg-tan/30 text-text-secondary hover:bg-tan/50 hover:text-navy"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
