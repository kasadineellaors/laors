import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getExposureRecord } from "@/lib/seedstock/exposure-queries";
import { ExposureDetailClient } from "@/components/cow-calf/exposure-detail-client";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Exposure Record — LAORS",
};

export default async function ExposureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  const exposure = await getExposureRecord(orgId, id, "cow_calf");
  if (!exposure) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cow-calf/breeding?tab=exposures"
          className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          ← Breeding
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Exposure record
        </h1>
      </div>
      <ExposureDetailClient orgId={orgId} exposure={exposure} canManage={canManage} />
    </div>
  );
}
