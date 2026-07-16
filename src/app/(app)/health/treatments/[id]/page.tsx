import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { toFeedGroupOptions } from "@/lib/feed/options";
import { getTreatment } from "@/lib/health/queries";
import { listMedicineOptions } from "@/lib/medicine/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { TreatmentDetailClient } from "@/components/health/treatment-detail-client";

export const metadata: Metadata = {
  title: "Treatment — LAORS",
};

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const treatment = await getTreatment(orgId, id);
  if (!treatment) notFound();

  const [locations, groups, members, medicineOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOrgMembers(orgId),
    listMedicineOptions(orgId),
  ]);

  return (
    <TreatmentDetailClient
      orgId={orgId}
      currentUserId={userId}
      treatment={treatment}
      locationOptions={locations}
      groupOptions={groups}
      memberOptions={members}
      medicineOptions={medicineOptions}
    />
  );
}

