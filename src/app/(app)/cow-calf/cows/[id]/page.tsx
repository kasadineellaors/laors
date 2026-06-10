import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getCow } from "@/lib/cow-calf/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { CowDetailClient } from "@/components/cow-calf/cow-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Cow — LAORS",
};

export default async function CowDetailPage({
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
  const cow = await getCow(orgId, id);
  if (!cow) notFound();

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
      <Link href="/cow-calf/cows" className="text-sm font-medium text-olive hover:underline">
        ← Cows
      </Link>
      <CowDetailClient
        orgId={orgId}
        cow={cow}
        locationOptions={locations}
        groupOptions={groups}
        canManage={canManage}
      />
    </div>
  );
}
