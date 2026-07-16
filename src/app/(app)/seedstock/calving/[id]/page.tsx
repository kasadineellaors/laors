import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { getCalvingRecord } from "@/lib/cow-calf/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import {
  listSeedstockDamOptions,
  listSeedstockSireOptions,
} from "@/lib/seedstock/queries";
import { getWeaningForCalving } from "@/lib/seedstock/weaning-queries";
import { SeedstockCalvingDetailClient } from "@/components/seedstock/seedstock-calving-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Calving Detail — LAORS",
};

export default async function SeedstockCalvingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const record = await getCalvingRecord(orgId, id);
  if (!record || record.calving_context !== "seedstock") notFound();

  const canManage = canWriteInventory(session.membership?.system_role);
  let weaningRecords: Awaited<ReturnType<typeof getWeaningForCalving>> = [];
  try {
    weaningRecords = await getWeaningForCalving(orgId, id);
  } catch {
    weaningRecords = [];
  }

  const [locationOptions, damOptions, sireOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listSeedstockDamOptions(orgId),
    listSeedstockSireOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/seedstock/calving" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Calving
      </Link>

      <SeedstockCalvingDetailClient
        orgId={orgId}
        record={record}
        weaningRecords={weaningRecords}
        locationOptions={locationOptions}
        damOptions={damOptions}
        sireOptions={sireOptions}
        canManage={canManage}
      />
    </div>
  );
}
