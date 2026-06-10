import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import {
  getCalvingRecord,
  listCalfClassifications,
} from "@/lib/cow-calf/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { CalvingDetailClient } from "@/components/cow-calf/calving-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Calving Record — LAORS",
};

export default async function CalvingDetailPage({
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

  const record = await getCalvingRecord(orgId, id);
  if (!record) notFound();

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
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Calving record</h1>
      </div>
      <CalvingDetailClient
        orgId={orgId}
        record={record}
        locationOptions={locations}
        groupOptions={groups}
        classificationOptions={classifications}
        canManage={canManage}
      />
    </div>
  );
}
