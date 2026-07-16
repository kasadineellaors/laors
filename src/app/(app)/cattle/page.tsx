import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchTotalHeadCount } from "@/lib/locations/rollups";
import { CattleGroupsList } from "@/components/inventory/cattle-groups-list";
import { CattlePageHeader } from "@/components/inventory/cattle-page-header";
import { CattleSummaryMetrics } from "@/components/inventory/cattle-summary-metrics";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Lots — LAORS",
};

export default async function CattlePage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  const showCowCalf = hasCowCalfMode(modes);
  const canManageCattle = canWriteInventory(session.membership?.system_role);

  const [groups, totalHead] = await Promise.all([
    listCattleGroups(orgId),
    getRanchTotalHeadCount(orgId),
  ]);

  const openLots = groups.filter((g) => g.lot_status !== "closed").length;
  const closedLots = groups.filter((g) => g.lot_status === "closed").length;
  const unassignedHead = groups
    .filter((g) => !g.location_id)
    .reduce((sum, g) => sum + g.total_head, 0);

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <CattlePageHeader
        totalHead={totalHead}
        canManageCattle={canManageCattle}
        showCowCalf={showCowCalf}
      />

      <CattleSummaryMetrics
        totalHead={totalHead}
        openLots={openLots}
        closedLots={closedLots}
        unassignedHead={unassignedHead > 0 ? unassignedHead : undefined}
      />

      <CattleGroupsList
        groups={groups}
        canManageCattle={canManageCattle}
        className="flex-1"
      />
    </div>
  );
}
