import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import {
  listSeedstockDamOptions,
  listSeedstockSireOptions,
} from "@/lib/seedstock/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { SeedstockBreedingForm } from "@/components/seedstock/breeding-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Record Breeding — LAORS",
};

export default async function NewSeedstockBreedingPage({
  searchParams,
}: {
  searchParams: Promise<{ damId?: string; sireId?: string }>;
}) {
  const { damId, sireId } = await searchParams;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
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
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Record breeding</h1>
      </div>
      <SeedstockBreedingForm
        orgId={orgId}
        locationOptions={locations}
        sireOptions={sires}
        damOptions={dams}
        defaultDamId={damId}
        defaultSireId={sireId}
      />
    </div>
  );
}
