import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listActiveBullOptions } from "@/lib/cow-calf/breeding-queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { BreedingForm } from "@/components/cow-calf/breeding-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Record Breeding — LAORS",
};

export default async function NewBreedingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const [locations, groups, bulls] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
    listActiveBullOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/breeding" className="text-sm font-medium text-olive hover:underline">
          ← Breeding
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Record breeding</h1>
      </div>
      <BreedingForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        bullOptions={bulls}
      />
    </div>
  );
}
