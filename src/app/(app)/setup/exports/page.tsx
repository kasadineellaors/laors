import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canExportReports } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { ExportHub } from "@/components/export/export-hub";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";
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
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Export Records"
        subtitle="Download cattle, treatment, feed, sales, and financial records."
      />
      {!canExport ? (
        <p className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white px-4 py-4 text-sm text-text-secondary shadow-[var(--shadow-card)]">
          Exports are limited to owners, managers, and accountants. You can still view records in
          the app.
        </p>
      ) : (
        <ExportHub orgId={orgId} showCowCalf={showCowCalf} showSeedstock={showSeedstock} />
      )}
    </ManageSubpageShell>
  );
}
