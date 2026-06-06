import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { listMedicineOptions } from "@/lib/medicine/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { TreatmentForm } from "@/components/health/treatment-form";

export const metadata: Metadata = {
  title: "Log Treatment — LAORS",
};

export default async function NewTreatmentPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [locations, groups, members, medicineOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({
        value: g.id,
        label: `${g.name} (${g.total_head} hd)`,
      })),
    ),
    listOrgMembers(orgId),
    listMedicineOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/health/treatments" className="text-sm font-medium text-olive hover:underline">
          ← Treatments
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Log treatment</h1>
      </div>
      <TreatmentForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        memberOptions={members}
        medicineOptions={medicineOptions}
      />
    </div>
  );
}
