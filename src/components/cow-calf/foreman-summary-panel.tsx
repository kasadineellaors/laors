import Link from "next/link";
import type { ForemanSummaryItem } from "@/lib/cow-calf/herd-types";
import { foremanSummaryHeadline } from "@/lib/cow-calf/foreman-summary";
import { SectionHeader } from "@/components/ui/section-header";

export function ForemanSummaryPanel({ items }: { items: ForemanSummaryItem[] }) {
  const headline = foremanSummaryHeadline(items);

  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <SectionHeader title="Cow-Calf foreman" description={headline} />
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm hover:bg-tan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    item.severity === "warning"
                      ? "bg-status-warning-bg text-text-primary"
                      : item.severity === "critical"
                        ? "bg-status-critical-bg text-text-primary"
                        : "bg-tan/10 text-text-primary"
                  }`}
                >
                  {item.message}
                </Link>
              ) : (
                <p className="text-sm text-text-secondary">{item.message}</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
