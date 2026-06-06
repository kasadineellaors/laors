import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getMedicineItem, listMedicineAdjustments } from "@/lib/medicine/queries";
import { MedicineDetailClient } from "@/components/health/medicine-detail-client";

export const metadata: Metadata = {
  title: "Medicine — LAORS",
};

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [item, adjustments] = await Promise.all([
    getMedicineItem(orgId, id),
    listMedicineAdjustments(orgId, id),
  ]);

  if (!item) notFound();

  return (
    <MedicineDetailClient orgId={orgId} item={item} adjustments={adjustments} />
  );
}
