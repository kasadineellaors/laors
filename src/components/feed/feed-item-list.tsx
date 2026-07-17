import Link from "next/link";
import type { FeedItemRecord } from "@/lib/feed/inventory-types";
import { ArchivedToggleSection } from "@/components/ui/archived-toggle-section";

interface FeedItemListProps {
  items: FeedItemRecord[];
  archivedItems?: FeedItemRecord[];
  emptyMessage?: string;
}

function FeedItemRow({ item, archived }: { item: FeedItemRecord; archived?: boolean }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">{item.name}</p>
          <p className="text-sm text-text-secondary">
            Unit: {item.unit}
            {item.price_per_unit != null ? ` · $${item.price_per_unit}/${item.unit}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-brown">{item.quantity_on_hand}</p>
          <p className="text-xs text-text-secondary">on hand</p>
        </div>
      </div>
      {!archived && item.is_low_stock ? (
        <p className="mt-2 text-xs font-semibold text-status-critical">Low stock — reorder soon</p>
      ) : null}
      {archived ? (
        <p className="mt-2 text-xs text-text-secondary">Archived — hidden from inventory and dashboards</p>
      ) : null}
    </>
  );

  if (archived) {
    return (
      <div className="block rounded-xl border border-dashed border-border-neutral bg-cream/30 px-4 py-3">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/feed/inventory/${item.id}`}
      className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
    >
      {content}
    </Link>
  );
}

export function FeedItemList({ items, archivedItems = [], emptyMessage }: FeedItemListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
        {emptyMessage ?? "No feedstuff in inventory yet."}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <FeedItemRow item={item} />
          </li>
        ))}
      </ul>
      <ArchivedToggleSection count={archivedItems.length} label="archived feedstuff">
        <ul className="space-y-3">
          {archivedItems.map((item) => (
            <li key={item.id}>
              <FeedItemRow item={item} archived />
            </li>
          ))}
        </ul>
      </ArchivedToggleSection>
    </>
  );
}
