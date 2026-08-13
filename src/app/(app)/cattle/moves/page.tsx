import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listRecentMovements } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { MoveHistoryList } from "@/components/inventory/move-history-list";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Move History — LAORS",
};

export default async function MoveHistoryPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [movements, movementReasons, locationTree] = await Promise.all([
    listRecentMovements(orgId),
    getRanchOptions(orgId, "movement_reasons"),
    getTreePickerOptions(orgId),
  ]);

  return (
    <AppPageShell>
      <AppPageHeader
        title="Move history"
        subtitle="Edit head count, date, destination, or notes — or void to reverse counts"
        backHref="/cattle"
        backLabel="Lots"
      />
      <MoveHistoryList
        orgId={orgId}
        movements={movements}
        movementReasonOptions={movementReasons}
        locationTree={locationTree}
      />
    </AppPageShell>
  );
}
