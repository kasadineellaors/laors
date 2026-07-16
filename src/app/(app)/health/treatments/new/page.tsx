import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { toFeedGroupOptions } from "@/lib/feed/options";
import { listMedicineOptions } from "@/lib/medicine/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { TreatmentForm } from "@/components/health/treatment-form";

export const metadata: Metadata = {
  title: "Log Treatment — LAORS",
};

export default async function NewTreatmentPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const [locations, groups, members, medicineOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOrgMembers(orgId),
    listMedicineOptions(orgId),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <Link href="/health/treatments" className="text-sm font-medium text-brown hover:underline">
          ← Treatments
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Log treatment
        </h1>
      </div>
      <TreatmentForm
        orgId={orgId}
        currentUserId={userId}
        locationOptions={locations}
        groupOptions={groups}
        memberOptions={members}
        medicineOptions={medicineOptions}
      />
    </div>
  );
}
