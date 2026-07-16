import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { BullForm } from "@/components/cow-calf/bull-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Register Bull — LAORS",
};

export default async function NewBullPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cow-calf/bulls");
  }

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
        <Link href="/cow-calf/bulls" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Bulls
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Register bull</h1>
      </div>
      <BullForm orgId={orgId} locationOptions={locations} groupOptions={groups} />
    </div>
  );
}
