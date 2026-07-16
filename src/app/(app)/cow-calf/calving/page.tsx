import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listCalvingRecords, getCalvingSummary } from "@/lib/cow-calf/queries";
import { CalvingList } from "@/components/cow-calf/calving-list";
import { ExportButtons } from "@/components/export/export-buttons";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Calving — LAORS",
};

export default async function CalvingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const [records, summary] = await Promise.all([
    listCalvingRecords(orgId),
    getCalvingSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Calving"
        subtitle={`${summary.thisMonth} this month · ${summary.live} live total`}
        backHref="/cow-calf"
        backLabel="Cow-Calf"
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <ExportButtons orgId={orgId} recordType="calving" size="sm" />
            <Link href="/cow-calf/calving/new">
              <Button size="lg">+ Log</Button>
            </Link>
          </div>
        }
      />
      <CalvingList records={records} />
    </div>
  );
}
