import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getFeedingRecord, listFeedRationOptions } from "@/lib/feed/queries";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { listOwnerOptions } from "@/lib/owners/queries";
import { toFeedGroupOptions, rationCostsToRecord, ownersToSelectOptions } from "@/lib/feed/options";
import { FeedingDetailClient } from "@/components/feed/feeding-detail-client";

export const metadata: Metadata = {
  title: "Feeding Record — LAORS",
};

export default async function FeedingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const feeding = await getFeedingRecord(orgId, id);
  if (!feeding) notFound();

  const [locations, groups, ownerOptions, members, rationOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOwnerOptions(orgId).then(ownersToSelectOptions),
    listOrgMembers(orgId),
    listFeedRationOptions(orgId),
  ]);

  const rationUnitCosts = rationCostsToRecord(
    await getRationUnitPrices(
      orgId,
      rationOptions.map((r) => r.id),
    ),
  );

  return (
    <div className="space-y-6">
      <FeedingDetailClient
        orgId={orgId}
        feeding={feeding}
        rationOptions={rationOptions}
        rationUnitCosts={rationUnitCosts}
        locationOptions={locations}
        groupOptions={groups}
        ownerOptions={ownerOptions}
        memberOptions={members}
      />
    </div>
  );
}
