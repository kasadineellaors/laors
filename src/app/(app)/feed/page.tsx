import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getFeedingSummary, listFeedRations, listFeedingRecords } from "@/lib/feed/queries";
import { listFeedItems } from "@/lib/feed/inventory-queries";
import { FeedPageHeader } from "@/components/feed/feed-page-header";
import { FeedSummaryMetrics } from "@/components/feed/feed-summary-metrics";
import { FeedLowStockAlert } from "@/components/feed/feed-low-stock-alert";
import { FeedModuleCard } from "@/components/feed/feed-module-card";
import { FeedingList } from "@/components/feed/feeding-list";

export const metadata: Metadata = {
  title: "Feed — LAORS",
};

export default async function FeedPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [rations, recentFeedings, feedItems, summary] = await Promise.all([
    listFeedRations(orgId),
    listFeedingRecords(orgId, { limit: 5, context: "general" }),
    listFeedItems(orgId),
    getFeedingSummary(orgId, "general"),
  ]);

  const lowStockCount = feedItems.filter((i) => i.is_low_stock).length;
  const feedingsThisWeek = summary.last7Days;

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <FeedPageHeader />

      <FeedLowStockAlert items={feedItems} />

      <FeedSummaryMetrics
        feedingsToday={summary.feedingsToday}
        amountFedThisWeek={summary.amountFedThisWeek}
        feedCostThisWeek={summary.feedCostThisWeek}
        lowStockCount={lowStockCount}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeedModuleCard
          href="/feed/inventory"
          title="Feedstuff Inventory"
          description="Track feed on hand, purchases, usage, and low-stock alerts."
          metric={`${feedItems.length} active · ${lowStockCount} low stock`}
          actionLabel="View inventory"
        />
        <FeedModuleCard
          href="/feed/rations"
          title="Rations"
          description="Build and manage feed mixes using inventory ingredients."
          metric={`${rations.length} active ration${rations.length === 1 ? "" : "s"}`}
          actionLabel="Manage rations"
        />
        <FeedModuleCard
          href="/feed/log"
          title="Feed Log"
          description="Review feeding history, quantities, costs, and employees."
          metric={`${feedingsThisWeek} feeding${feedingsThisWeek === 1 ? "" : "s"} this week`}
          actionLabel="View feed log"
        />
      </div>

      <section className="flex-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Recent feedings</h2>
          {recentFeedings.length > 0 ? (
            <Link href="/feed/log" className="text-sm font-medium text-brown hover:underline">
              View all
            </Link>
          ) : null}
        </div>
        <FeedingList records={recentFeedings} detailBasePath="/feed/log" />
      </section>
    </div>
  );
}
