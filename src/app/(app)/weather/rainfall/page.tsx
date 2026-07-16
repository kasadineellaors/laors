import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRainfallSummary, listRainfall } from "@/lib/weather/queries";
import { RainfallList } from "@/components/weather/rainfall-list";
import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Rainfall — LAORS",
};

export default async function RainfallPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [records, summary] = await Promise.all([
    listRainfall(orgId),
    getRainfallSummary(orgId),
  ]);

  return (
    <AppPageShell>
      <AppPageHeader
        title="Rainfall"
        subtitle={`${summary.totalLast30Days}" in the last 30 days${summary.recordCount > 0 ? ` (${summary.recordCount} entries)` : ""}`}
        actions={
          <Link href="/weather/rainfall/new">
            <Button size="md" fullWidth className="sm:w-auto">
              + Log
            </Button>
          </Link>
        }
      />
      <RainfallList
        records={records}
        emptyMessage="No rainfall logged yet — tap + Log to record."
      />
    </AppPageShell>
  );
}
