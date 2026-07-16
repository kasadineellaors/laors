import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { listCowCalfHerdOptions } from "@/lib/cow-calf/breeding-queries";
import { listCalvesReadyToWean } from "@/lib/cow-calf/exit-queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { CowCalfWeaningForm } from "@/components/cow-calf/weaning-form";

export const metadata: Metadata = {
  title: "Wean Calves — Cow-Calf — LAORS",
};

export default async function NewWeaningPage({
  searchParams,
}: {
  searchParams: Promise<{ herd?: string }>;
}) {
  const { herd } = await searchParams;
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;

  const [locations, herds, calves] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCowCalfHerdOptions(orgId),
    listCalvesReadyToWean(orgId, herd),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cow-calf/weaning" className="text-sm font-medium text-brown hover:underline">
          ← Weaning
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Wean calves</h1>
      </div>
      <CowCalfWeaningForm
        orgId={orgId}
        herdOptions={herds}
        locationOptions={locations}
        calfOptions={calves}
        defaultHerdId={herd}
      />
    </div>
  );
}
