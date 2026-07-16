import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { getFeedRation } from "@/lib/feed/queries";
import { listFeedItemOptions, listRationIngredients, listRationPriceHistory } from "@/lib/feed/inventory-queries";
import { RationDetailClient } from "@/components/feed/ration-detail-client";

export const metadata: Metadata = {
  title: "Feed Ration — LAORS",
};

export default async function RationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const canManage = canManageTeam(session.membership?.system_role);
  const ration = await getFeedRation(orgId, id);
  if (!ration) notFound();

  const [feedItems, ingredients, priceHistory] = await Promise.all([
    listFeedItemOptions(orgId),
    listRationIngredients(orgId, id),
    listRationPriceHistory(orgId, id),
  ]);

  return (
    <div className="space-y-6">
      <RationDetailClient
        orgId={orgId}
        ration={ration}
        canManage={canManage}
        feedItems={feedItems}
        ingredients={ingredients}
        priceHistory={priceHistory}
      />
    </div>
  );
}
