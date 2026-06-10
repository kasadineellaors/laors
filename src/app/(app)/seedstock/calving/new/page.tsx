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
import { SeedstockCalvingForm } from "@/components/seedstock/seedstock-calving-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Record Calving — LAORS",
};

export default async function NewSeedstockCalvingPage({
  searchParams,
}: {
  searchParams: Promise<{ damId?: string }>;
}) {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");
  if (!canWriteInventory(session.membership?.system_role)) redirect("/seedstock/calving");

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
        <Link href="/seedstock/calving" className="text-sm font-medium text-olive hover:underline">
          ← Calving
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Record calving</h1>
      </div>
      <SeedstockCalvingForm
        orgId={orgId}
        locationOptions={locationOptions}
        damOptions={damOptions}
        sireOptions={sireOptions}
        defaultDamId={damId}
      />
    </div>
  );
}
