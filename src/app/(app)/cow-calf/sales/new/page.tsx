import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { listCowCalfHerdOptions } from "@/lib/cow-calf/breeding-queries";
import { listCowCalfAnimalOptions } from "@/lib/cow-calf/exit-queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { CowCalfSaleForm } from "@/components/cow-calf/cow-calf-sale-form";

export const metadata: Metadata = {
  title: "Record Sale — Cow-Calf — LAORS",
};

export default async function NewCowCalfSalePage({
  searchParams,
}: {
  searchParams: Promise<{ herd?: string }>;
}) {
  const { herd } = await searchParams;
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;

  const [locations, herds, animals] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCowCalfHerdOptions(orgId),
    listCowCalfAnimalOptions(orgId, ["cow", "heifer", "bull", "other"]),
  ]);

  const filteredAnimals = herd ? animals.filter((a) => a.herdId === herd) : animals;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/sales" className="text-sm font-medium text-brown hover:underline">
          ← Sales
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Record sale</h1>
      </div>
      <CowCalfSaleForm
        orgId={orgId}
        herdOptions={herds}
        locationOptions={locations}
        animalOptions={filteredAnimals}
        defaultHerdId={herd}
      />
    </div>
  );
}
