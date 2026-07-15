import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listFeedRations, listFeedingRecords } from "@/lib/feed/queries";
import { countLowStockFeedItems, listFeedItems } from "@/lib/feed/inventory-queries";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedingList } from "@/components/feed/feeding-list";

export const metadata: Metadata = {
  title: "Feed — LAORS",
};

export default async function FeedPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [rations, recentFeedings, feedItems, lowStock] = await Promise.all([
    listFeedRations(orgId),
    listFeedingRecords(orgId, { limit: 5, context: "general" }),
    listFeedItems(orgId),
    countLowStockFeedItems(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Feed</h1>
        <p className="text-charcoal/70">Log what you fed — pen, owner, ration, date</p>
      </div>

      {lowStock > 0 ? (
        <div className="rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust">
          {lowStock} feedstuff item{lowStock === 1 ? "" : "s"} low on stock.{" "}
          <Link href="/feed/inventory" className="font-semibold underline">
            Check inventory
          </Link>
        </div>
      ) : null}

      <Link href="/feed/log/new">
        <Button fullWidth size="xl">
          + Log feeding
        </Button>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
          <p className="text-2xl font-bold text-olive">{feedItems.length}</p>
          <p className="text-xs text-charcoal/60">Feedstuff</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
          <p className="text-2xl font-bold text-olive">{rations.length}</p>
          <p className="text-xs text-charcoal/60">Rations</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-4 text-center">
          <p className="text-2xl font-bold text-olive">{recentFeedings.length}</p>
          <p className="text-xs text-charcoal/60">Recent logs</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/feed/inventory">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Feedstuff inventory</CardTitle>
              <CardDescription>Hay, grain, supplement on hand — with low-stock alerts.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/feed/rations">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Rations</CardTitle>
              <CardDescription>Build mixes from inventory — deducted when you log feeding.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/feed/log">
          <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
            <CardHeader>
              <CardTitle>Feed log</CardTitle>
              <CardDescription>Pen → owner → ration → date → amount.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {recentFeedings.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-charcoal">Recent feedings</h2>
          <FeedingList records={recentFeedings} detailBasePath="/feed/log" />
        </div>
      ) : null}
    </div>
  );
}
