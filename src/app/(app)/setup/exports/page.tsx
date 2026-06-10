import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canExportReports } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { ExportHub } from "@/components/export/export-hub";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Export Records — LAORS",
};

export default async function SetupExportsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  const showCowCalf = hasCowCalfMode(modes);
  const showSeedstock = hasSeedstockMode(modes);
  const canExport = canExportReports(session.membership?.system_role);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← More
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Export records</h1>
        <p className="text-charcoal/70">Download treatments, feed, sales, invoices, and more</p>
      </div>
      {!canExport ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-4 text-sm text-charcoal/70">
          Exports are limited to owners, managers, and accountants. You can still view records in the
          app.
        </p>
      ) : (
        <ExportHub orgId={orgId} showCowCalf={showCowCalf} showSeedstock={showSeedstock} />
      )}
    </div>
  );
}
