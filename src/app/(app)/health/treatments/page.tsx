import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listTreatments } from "@/lib/health/queries";
import { TreatmentList } from "@/components/health/treatment-list";
import { ExportButtons } from "@/components/export/export-buttons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Treatments — LAORS",
};

export default async function TreatmentsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const treatments = await listTreatments(orgId, 200);

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/health" className="text-sm font-medium text-brown hover:underline">
            ← Health
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
            Treatments
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Vaccinations, treatments, health events, withdrawals, and follow-up records.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Link href="/health/treatments/new">
            <Button size="md" fullWidth className="sm:w-auto">
              + Log Treatment
            </Button>
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/health/medicine">
              <Button variant="outline" size="sm">
                Medicine Inventory
              </Button>
            </Link>
            <ExportButtons orgId={orgId} recordType="treatments" size="sm" compact />
          </div>
        </div>
      </div>

      <TreatmentList
        treatments={treatments}
        emptyMessage="No treatments yet — log your first treatment to get started."
      />
    </div>
  );
}
