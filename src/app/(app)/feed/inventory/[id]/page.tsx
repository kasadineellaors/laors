import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getFeedItem, listFeedStockAdjustments } from "@/lib/feed/inventory-queries";
import { FeedItemDetailClient } from "@/components/feed/feed-item-detail-client";

export const metadata: Metadata = {
  title: "Feedstuff — LAORS",
};

export default async function FeedItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const item = await getFeedItem(orgId, id);
  if (!item) notFound();

  const adjustments = await listFeedStockAdjustments(orgId, id);

  return (
    <FeedItemDetailClient orgId={orgId} item={item} adjustments={adjustments} />
  );
}
