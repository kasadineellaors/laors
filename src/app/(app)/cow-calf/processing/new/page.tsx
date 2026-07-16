import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { listCowCalfHerdOptions } from "@/lib/cow-calf/breeding-queries";
import { listCalfOptionsForHerd } from "@/lib/cow-calf/processing-queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { ProcessingForm } from "@/components/cow-calf/processing-form";

export const metadata: Metadata = {
  title: "Process Calves — Cow-Calf — LAORS",
};

export default async function NewProcessingPage({
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
    listCalfOptionsForHerd(orgId, herd),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cow-calf/processing"
          className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          ← Processing
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Process calves
        </h1>
      </div>
      <ProcessingForm
        orgId={orgId}
        herdOptions={herds}
        locationOptions={locations}
        calfOptions={calves}
        defaultHerdId={herd}
      />
    </div>
  );
}
