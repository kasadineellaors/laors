import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { getTreePickerOptions } from "@/lib/locations/options";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import {
  listSeedstockDamOptions,
  listSeedstockSireOptions,
} from "@/lib/seedstock/queries";
import { ExposureForm } from "@/components/seedstock/exposure-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Record Exposure — LAORS",
};

export default async function NewExposurePage({
  searchParams,
}: {
  searchParams: Promise<{ damId?: string }>;
}) {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");
  if (!canWriteInventory(session.membership?.system_role)) redirect("/seedstock/exposure");

  const { damId } = await searchParams;
  const orgId = session.organization!.id;
  const [locationOptions, damOptions, sireOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listSeedstockDamOptions(orgId),
    listSeedstockSireOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock/exposure" className="text-sm font-medium text-olive hover:underline">
          ← Exposure
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Record exposure</h1>
      </div>
      <ExposureForm
        orgId={orgId}
        locationOptions={locationOptions}
        damOptions={damOptions}
        sireOptions={sireOptions}
        defaultDamId={damId}
      />
    </div>
  );
}
