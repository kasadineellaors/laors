import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedItems } from "@/lib/feed/inventory-queries";
import { FeedItemList } from "@/components/feed/feed-item-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Feed Inventory — LAORS",
};

export default async function FeedInventoryPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const items = await listFeedItems(orgId);
  const lowStock = items.filter((i) => i.is_low_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/feed" className="text-sm font-medium text-olive hover:underline">
            ← Feed
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Feedstuff inventory</h1>
          <p className="text-charcoal/70">
            Hay, grain, supplement on hand — {items.length} item{items.length === 1 ? "" : "s"}
            {lowStock > 0 ? ` · ${lowStock} low stock` : ""}
          </p>
        </div>
        <Link href="/feed/inventory/new">
          <Button size="lg">+ Add</Button>
        </Link>
      </div>

      <FeedItemList
        items={items}
        emptyMessage="Add feedstuff you keep on hand — then build rations from inventory."
      />
    </div>
  );
}
