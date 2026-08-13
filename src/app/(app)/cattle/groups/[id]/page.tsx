import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listOwnerOptions } from "@/lib/owners/queries";
import { canWriteInventory } from "@/lib/auth/roles";
import { getCattleGroup } from "@/lib/inventory/queries";
import {
  needsLotRollupRepair,
  resolveLotMetrics,
} from "@/lib/inventory/lot-display";
import {
  getLotOperationalSummary,
  listMortalityRecords,
  listProcessingEvents,
} from "@/lib/lots/queries";
import { listLotPurchases } from "@/lib/lots/purchase-queries";
import { syncLotPurchaseRollups } from "@/lib/lots/sync-purchase-rollups";
import { listLotExpenses } from "@/lib/expenses/queries";
import { getRanchFieldSuggestions } from "@/lib/ranch/field-suggestions";
import { getRanchOptions } from "@/lib/locations/options";
import { createClient } from "@/lib/supabase/server";
import { GroupDetailClient } from "@/components/inventory/group-detail-client";

export const metadata: Metadata = {
  title: "Lot Detail — LAORS",
};

export default async function CattleGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  let group = await getCattleGroup(orgId, id);
  if (!group) notFound();

  const lotPurchases = await listLotPurchases(orgId, id);

  if (needsLotRollupRepair(group, lotPurchases)) {
    const supabase = await createClient();
    await syncLotPurchaseRollups(supabase, orgId, id);
    group = (await getCattleGroup(orgId, id)) ?? group;
  }

  const metrics = resolveLotMetrics(group, lotPurchases);
  const displayGroup = { ...group, ...metrics };

  const [
    adjustmentReasons,
    ownerOptions,
    expenseCategoryOptions,
    lotSummary,
    processingEvents,
    mortalityRecords,
    lotExpenses,
    fieldSuggestions,
  ] = await Promise.all([
    getRanchOptions(orgId, "adjustment_reasons"),
    listOwnerOptions(orgId).then((rows) =>
      rows.map((o) => ({
        value: o.id,
        label: o.is_ownership_group ? `${o.name} (group)` : o.name,
      })),
    ),
    getRanchOptions(orgId, "financial_categories"),
    getLotOperationalSummary(
      orgId,
      id,
      displayGroup.landed_cost,
      displayGroup.opened_at ?? displayGroup.arrival_date ?? displayGroup.purchase_date,
      displayGroup.total_head,
      metrics.avg_weight_lbs,
      metrics.current_avg_weight_lbs,
    ),
    listProcessingEvents(orgId, id),
    listMortalityRecords(orgId, id),
    listLotExpenses(orgId, id),
    getRanchFieldSuggestions(orgId),
  ]);

  const canManageCattle = canWriteInventory(session.membership?.system_role);

  return (
    <GroupDetailClient
      orgId={orgId}
      group={displayGroup}
      lotSummary={lotSummary}
      processingEvents={processingEvents}
      mortalityRecords={mortalityRecords}
      lotExpenses={lotExpenses}
      lotPurchases={lotPurchases}
      expenseCategoryOptions={expenseCategoryOptions}
      adjustmentReasonOptions={adjustmentReasons}
      ownerOptions={ownerOptions}
      fieldSuggestions={{
        sellers: fieldSuggestions.sellers,
        sources: fieldSuggestions.sources,
        suppliers: fieldSuggestions.suppliers,
      }}
      canManageCattle={canManageCattle}
    />
  );
}
