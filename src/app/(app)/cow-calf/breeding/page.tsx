import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import {
  getBreedingSummary,
  getPregnancyRateSummary,
  listBreedingRecords,
  listDueSoonBreedingRecords,
} from "@/lib/cow-calf/breeding-queries";
import { listExposureRecords } from "@/lib/seedstock/exposure-queries";
import { BreedingHubClient } from "@/components/cow-calf/breeding-hub-client";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Breeding — LAORS",
};

type Tab = "records" | "exposures" | "due";

function parseTab(value?: string): Tab {
  if (value === "exposures" || value === "due") return value;
  return "records";
}

export default async function BreedingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [records, exposures, dueSoon, summary, pregnancyRate] = await Promise.all([
    listBreedingRecords(orgId),
    listExposureRecords(orgId, "cow_calf").catch(() => []),
    listDueSoonBreedingRecords(orgId),
    getBreedingSummary(orgId),
    getPregnancyRateSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/cow-calf"
            className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          >
            ← Cow-Calf
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
            Breeding
          </h1>
          <p className="text-text-secondary">
            Reproduction — exposures, breeding records, and calving due dates
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link href="/cow-calf/exposure/new">
              <Button variant="secondary" size="lg">
                + Exposure
              </Button>
            </Link>
            <Link href="/cow-calf/breeding/new">
              <Button size="lg">+ Breeding</Button>
            </Link>
          </div>
        ) : null}
      </div>

      <BreedingHubClient
        records={records}
        exposures={exposures}
        dueSoon={dueSoon}
        summary={summary}
        pregnancyRateLabel={pregnancyRate.label}
        canManage={canManage}
        initialTab={tab}
      />
    </div>
  );
}
