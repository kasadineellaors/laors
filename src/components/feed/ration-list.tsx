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
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
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
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">{r.name}</p>
                <p className="text-sm text-charcoal/70">{formatPrice(r.price_per_unit, r.unit)}</p>
              </div>
              <span className="shrink-0 text-xs capitalize text-charcoal/50">{r.unit}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
