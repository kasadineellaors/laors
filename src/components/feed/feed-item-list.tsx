import Link from "next/link";
import type { FeedItemRecord } from "@/lib/feed/inventory-types";

interface FeedItemListProps {
  items: FeedItemRecord[];
  emptyMessage?: string;
}

export function FeedItemList({ items, emptyMessage }: FeedItemListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-charcoal/60">
        {emptyMessage ?? "No feedstuff in inventory yet."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/feed/inventory/${item.id}`}
            className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-olive/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal">{item.name}</p>
                <p className="text-sm text-charcoal/60">
                  Unit: {item.unit}
                  {item.price_per_unit != null ? ` · $${item.price_per_unit}/${item.unit}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-olive">{item.quantity_on_hand}</p>
                <p className="text-xs text-charcoal/50">on hand</p>
              </div>
            </div>
            {item.is_low_stock ? (
              <p className="mt-2 text-xs font-semibold text-rust">Low stock — reorder soon</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
