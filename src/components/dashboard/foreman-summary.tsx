import Link from "next/link";

export type ForemanSummaryItem = {
  id: string;
  message: string;
  href?: string;
  linkLabel?: string;
  tone?: "default" | "warning";
};

interface ForemanSummaryProps {
  items: ForemanSummaryItem[];
}

export function ForemanSummary({ items }: ForemanSummaryProps) {
  const display = items.slice(0, 4);

  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-bold text-navy">Today&apos;s Foreman Report</h2>
      {display.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">Everything looks on track today.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {display.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm text-text-primary">
              {item.tone === "warning" ? (
                <span className="mt-0.5 text-status-warning" aria-hidden>
                  ●
                </span>
              ) : (
                <span className="mt-0.5 text-navy" aria-hidden>
                  ●
                </span>
              )}
              <span>
                {item.message}
                {item.href && item.linkLabel ? (
                  <>
                    {" "}
                    <Link
                      href={item.href}
                      className="font-semibold text-navy underline underline-offset-2"
                    >
                      {item.linkLabel}
                    </Link>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
