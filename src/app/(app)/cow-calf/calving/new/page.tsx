import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listCalfClassifications } from "@/lib/cow-calf/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { CalvingForm } from "@/components/cow-calf/calving-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Log Calving — LAORS",
};

export default async function NewCalvingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [locations, groups, classifications] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
    listCalfClassifications(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/calving" className="text-sm font-medium text-olive hover:underline">
          ← Calving
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Log calving</h1>
      </div>
      <CalvingForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        classificationOptions={classifications}
        canAddToInventory={canManage}
      />
    </div>
  );
}
