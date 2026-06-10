import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listSeedstockAnimals } from "@/lib/seedstock/queries";
import { SeedstockAnimalList } from "@/components/seedstock/animal-list";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Seedstock Animals — LAORS",
};

export default async function SeedstockAnimalsPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const animals = await listSeedstockAnimals(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seedstock" className="text-sm font-medium text-olive hover:underline">
            ← Seedstock
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Animals</h1>
          <p className="text-charcoal/70">
            {animals.filter((a) => a.status === "active").length} active in registry
          </p>
        </div>
        {canManage ? (
          <Link href="/seedstock/animals/new">
            <Button size="lg">+ Register</Button>
          </Link>
        ) : null}
      </div>
      <SeedstockAnimalList animals={animals} />
    </div>
  );
}
