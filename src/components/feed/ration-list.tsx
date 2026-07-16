import Link from "next/link";
import type { FeedRationRecord } from "@/lib/feed/types";

interface RationListProps {
  rations: FeedRationRecord[];
  emptyMessage?: string;
}

function formatPrice(value: number | null, unit: string) {
  if (value == null) return "No price set";
  return `$${value}/${unit}`;
}

export function RationList({ rations, emptyMessage }: RationListProps) {
  if (rations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No feed rations yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rations.map((r) => (
        <li key={r.id}>
          <Link
            href={`/feed/rations/${r.id}`}
            className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy">{r.name}</p>
                <p className="text-sm text-text-secondary">{formatPrice(r.price_per_unit, r.unit)}</p>
              </div>
              <span className="shrink-0 text-xs capitalize text-text-secondary">{r.unit}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
