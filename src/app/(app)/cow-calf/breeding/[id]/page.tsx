import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import {
  getBreedingRecord,
  listActiveBullOptions,
  listCowCalfDamOptions,
  listCowCalfHerdOptions,
} from "@/lib/cow-calf/breeding-queries";
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

  const [locations, herds, bulls, dams] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCowCalfHerdOptions(orgId),
    listActiveBullOptions(orgId),
    listCowCalfDamOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cow-calf/breeding"
          className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          ← Breeding
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Breeding record
        </h1>
      </div>
      <BreedingDetailClient
        orgId={orgId}
        record={record}
        locationOptions={locations}
        herdOptions={herds}
        bullOptions={bulls}
        damOptions={dams}
        canManage={canManage}
      />
    </div>
  );
}
