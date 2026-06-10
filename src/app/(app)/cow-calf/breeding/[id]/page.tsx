import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import {
  getBreedingRecord,
  listActiveBullOptions,
} from "@/lib/cow-calf/breeding-queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { BreedingDetailClient } from "@/components/cow-calf/breeding-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Breeding Record — LAORS",
};

export default async function BreedingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const record = await getBreedingRecord(orgId, id);
  if (!record) notFound();

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
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Breeding record</h1>
      </div>
      <BreedingDetailClient
        orgId={orgId}
        record={record}
        locationOptions={locations}
        groupOptions={groups}
        bullOptions={bulls}
        canManage={canManage}
      />
    </div>
  );
}
