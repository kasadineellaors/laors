import Link from "next/link";
import type { ForemanSummaryItem } from "@/lib/cow-calf/herd-types";
import { foremanSummaryHeadline } from "@/lib/cow-calf/foreman-summary";

export function ForemanSummaryPanel({ items }: { items: ForemanSummaryItem[] }) {
  const headline = foremanSummaryHeadline(items);

  return (
    <section className="rounded-xl border border-border-neutral bg-surface-white p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate">Cow-Calf foreman</h2>
      <p className="mt-2 text-base font-medium text-navy">{headline}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm hover:bg-tan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    item.severity === "warning"
                      ? "bg-status-warning/10 text-text-primary"
                      : item.severity === "critical"
                        ? "bg-status-critical/10 text-text-primary"
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
