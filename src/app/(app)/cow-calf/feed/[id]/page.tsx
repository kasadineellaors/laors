import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getTreePickerOptions, getRanchOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getFeedingRecord, listFeedRationOptions } from "@/lib/feed/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { FeedingDetailClient } from "@/components/feed/feeding-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Cow-Calf Feeding — LAORS",
};

export default async function CowCalfFeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const feeding = await getFeedingRecord(orgId, id);
  if (!feeding || feeding.feeding_context !== "cow_calf") notFound();

  const [locations, groups, owners, members, rationOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
    getRanchOptions(orgId, "ownership_groups"),
    listOrgMembers(orgId),
    listFeedRationOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <FeedingDetailClient
        orgId={orgId}
        feeding={feeding}
        rationOptions={rationOptions}
        locationOptions={locations}
        groupOptions={groups}
        ownerOptions={owners}
        memberOptions={members}
        listPath="/cow-calf/feed"
        detailBasePath="/cow-calf/feed"
        backLabel="← Cow-calf feed"
      />
    </div>
  );
}
