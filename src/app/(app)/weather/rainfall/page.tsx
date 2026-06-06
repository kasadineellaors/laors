import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRainfallSummary, listRainfall } from "@/lib/weather/queries";
import { RainfallList } from "@/components/weather/rainfall-list";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Rainfall</h1>
          <p className="text-charcoal/70">
            {summary.totalLast30Days}&quot; in the last 30 days
            {summary.recordCount > 0 ? ` (${summary.recordCount} entries)` : ""}
          </p>
        </div>
        <Link href="/weather/rainfall/new">
          <Button size="lg">+ Log</Button>
        </Link>
      </div>

      <RainfallList
        records={records}
        emptyMessage="No rainfall logged yet — tap + Log to record."
      />
    </div>
  );
}
