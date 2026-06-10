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
  const treatments = await listTreatments(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Treatments</h1>
          <p className="text-charcoal/70">Vaccines, dewormers, and health records</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <ExportButtons orgId={orgId} recordType="treatments" size="sm" />
          <Link href="/health/medicine">
            <Button variant="outline" size="lg">
              Medicine
            </Button>
          </Link>
          <Link href="/health/treatments/new">
            <Button size="lg">+ Log</Button>
          </Link>
        </div>
      </div>

      <TreatmentList
        treatments={treatments}
        emptyMessage="No treatments yet — tap + Log to record one."
      />
    </div>
  );
}
