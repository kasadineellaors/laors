import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { SeedstockAnimalForm } from "@/components/seedstock/animal-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Register Animal — LAORS",
};

export default async function NewSeedstockAnimalPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");
  if (!canWriteInventory(session.membership?.system_role)) redirect("/seedstock/animals");

  const orgId = session.organization!.id;
  const [locationOptions, groupOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock/animals" className="text-sm font-medium text-olive hover:underline">
          ← Animals
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Register animal</h1>
      </div>
      <SeedstockAnimalForm
        orgId={orgId}
        locationOptions={locationOptions}
        groupOptions={groupOptions}
      />
    </div>
  );
}
