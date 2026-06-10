import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listBreedingForAnimal } from "@/lib/cow-calf/breeding-queries";
import { listSalesForAnimal } from "@/lib/sales/queries";
import { getSeedstockAnimal } from "@/lib/seedstock/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import {
  computeFertilityScoreForDam,
  computeMaternalLifetimeValues,
  loadMaternalDataset,
} from "@/lib/seedstock/maternal";
import { SeedstockAnimalDetailClient } from "@/components/seedstock/animal-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Animal — LAORS",
};

export default async function SeedstockAnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const [animal, breedingRecords, salesRecords] = await Promise.all([
    getSeedstockAnimal(orgId, id),
    listBreedingForAnimal(orgId, id),
    listSalesForAnimal(orgId, id),
  ]);
  if (!animal) notFound();

  const isFemale = animal.animal_type === "cow" || animal.animal_type === "heifer";
  let fertility = null;
  let lifetime = null;
  if (isFemale) {
    try {
      const dataset = await loadMaternalDataset(orgId);
      fertility = computeFertilityScoreForDam(dataset, id);
      lifetime = computeMaternalLifetimeValues(dataset).find((l) => l.animalId === id) ?? null;
    } catch {
      // Phase 16 tables may not be applied yet
    }
  }

  const canManage = canWriteInventory(session.membership?.system_role);
  const [locationOptions, groupOptions] = canManage
    ? await Promise.all([
        getTreePickerOptions(orgId).then((nodes) =>
          nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
        ),
        listCattleGroups(orgId).then((gs) =>
          gs.map((g) => ({ value: g.id, label: `${g.name} (${g.total_head} hd)` })),
        ),
      ])
    : [[], []];

  return (
    <SeedstockAnimalDetailClient
      orgId={orgId}
      animal={animal}
      breedingRecords={breedingRecords}
      salesRecords={salesRecords}
      fertility={fertility}
      lifetime={lifetime}
      locationOptions={locationOptions}
      groupOptions={groupOptions}
      canManage={canManage}
    />
  );
}
