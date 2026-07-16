import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { getBreedingRecord } from "@/lib/cow-calf/breeding-queries";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import {
  listSeedstockDamOptions,
  listSeedstockSireOptions,
} from "@/lib/seedstock/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { SeedstockBreedingDetailClient } from "@/components/seedstock/breeding-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Breeding Record — LAORS",
};

export default async function SeedstockBreedingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const record = await getBreedingRecord(orgId, id, "seedstock");
  if (!record) notFound();

  const [locations, sires, dams] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listSeedstockSireOptions(orgId),
    listSeedstockDamOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock/breeding" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Breeding
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Breeding record</h1>
      </div>
      <SeedstockBreedingDetailClient
        orgId={orgId}
        record={record}
        locationOptions={locations}
        sireOptions={sires}
        damOptions={dams}
        canManage={canManage}
      />
    </div>
  );
}
