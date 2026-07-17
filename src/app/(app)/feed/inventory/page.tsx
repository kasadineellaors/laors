import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listArchivedFeedItems, listFeedItems } from "@/lib/feed/inventory-queries";
import { FeedItemList } from "@/components/feed/feed-item-list";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Feed Inventory — LAORS",
};

export default async function FeedInventoryPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const [items, archivedItems] = await Promise.all([
    listFeedItems(orgId),
    listArchivedFeedItems(orgId),
  ]);
  const lowStock = items.filter((i) => i.is_low_stock).length;

  return (
    <AppPageShell>
      <AppPageHeader
        title="Feedstuff Inventory"
        subtitle={`Hay, grain, and supplement on hand — ${items.length} item${items.length === 1 ? "" : "s"}${lowStock > 0 ? ` · ${lowStock} low stock` : ""}`}
        backHref="/feed"
        backLabel="Feed"
        actions={
          <Link href="/feed/inventory/new">
            <Button size="md" fullWidth className="sm:w-auto">
              + Add
            </Button>
          </Link>
        }
      />
      <FeedItemList
        items={items}
        archivedItems={archivedItems}
        emptyMessage="Add feedstuff you keep on hand — then build rations from inventory."
      />
    </AppPageShell>
  );
}
