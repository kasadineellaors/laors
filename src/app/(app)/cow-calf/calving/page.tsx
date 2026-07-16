import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listCalvingRecords, getCalvingSummary } from "@/lib/cow-calf/queries";
import { CalvingList } from "@/components/cow-calf/calving-list";
import { ExportButtons } from "@/components/export/export-buttons";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/cow-calf" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
            ← Cow-Calf
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Calving</h1>
          <p className="text-text-secondary">
            {summary.thisMonth} this month · {summary.live} live total
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <ExportButtons orgId={orgId} recordType="calving" size="sm" />
          <Link href="/cow-calf/calving/new">
            <Button size="lg">+ Log</Button>
          </Link>
        </div>
      </div>
      <CalvingList records={records} />
    </div>
  );
}
