import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { CowForm } from "@/components/cow-calf/cow-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Register Cow — LAORS",
};

export default async function NewCowPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");
  if (!canWriteInventory(session.membership?.system_role)) redirect("/cow-calf/cows");

  const orgId = session.organization!.id;
  const [locations, groups] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/cows" className="text-sm font-medium text-olive hover:underline">
          ← Cows
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Register cow</h1>
      </div>
      <CowForm orgId={orgId} locationOptions={locations} groupOptions={groups} />
    </div>
  );
}
