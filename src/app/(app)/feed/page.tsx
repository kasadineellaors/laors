import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getFeedingSummary, listFeedRations, listFeedingRecords } from "@/lib/feed/queries";
import { listFeedItems } from "@/lib/feed/inventory-queries";
import { FeedPageHeader } from "@/components/feed/feed-page-header";
import { FeedSummaryMetrics } from "@/components/feed/feed-summary-metrics";
import { FeedLowStockAlert } from "@/components/feed/feed-low-stock-alert";
import { FeedModuleCard } from "@/components/feed/feed-module-card";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { FeedingList } from "@/components/feed/feeding-list";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Feed — LAORS",
};

export default async function FeedPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  const showCowCalf = hasCowCalfMode(modes);

  const [rations, recentFeedings, feedItems, summary, cowCalfSummary] = await Promise.all([
    listFeedRations(orgId),
    listFeedingRecords(orgId, { limit: 5, context: "general" }),
    listFeedItems(orgId),
    getFeedingSummary(orgId, "general"),
    showCowCalf ? getFeedingSummary(orgId, "cow_calf") : Promise.resolve(null),
  ]);

  const lowStockCount = feedItems.filter((i) => i.is_low_stock).length;
  const feedingsThisWeek = summary.last7Days;

  return (
    <AppPageShell>
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
        {showCowCalf ? (
          <FeedModuleCard
            href="/cow-calf/feed"
            title="Cow-Calf Feed"
            description="Hay, mineral, and supplement for pairs and pastures."
            metric={`${cowCalfSummary?.last7Days ?? 0} feeding${cowCalfSummary?.last7Days === 1 ? "" : "s"} this week`}
            actionLabel="Log cow-calf feed"
          />
        ) : null}
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
    </AppPageShell>
  );
}
