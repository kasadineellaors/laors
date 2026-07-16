import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listCustomerOptions } from "@/lib/customers/queries";
import { canWriteInventory } from "@/lib/auth/roles";
import { getCattleGroup } from "@/lib/inventory/queries";
import {
  getLotOperationalSummary,
  listMortalityRecords,
  listProcessingEvents,
} from "@/lib/lots/queries";
import { listLotExpenses } from "@/lib/expenses/queries";
import { getRanchOptions } from "@/lib/locations/options";
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

  const group = await getCattleGroup(orgId, id);
  if (!group) notFound();

  const [
    adjustmentReasons,
    ownershipOptions,
    customerOptions,
    expenseCategoryOptions,
    lotSummary,
    processingEvents,
    mortalityRecords,
    lotExpenses,
  ] = await Promise.all([
    getRanchOptions(orgId, "adjustment_reasons"),
    getRanchOptions(orgId, "ownership_groups"),
    listCustomerOptions(orgId).then((rows) =>
      rows.map((c) => ({ value: c.id, label: c.name })),
    ),
    getRanchOptions(orgId, "financial_categories"),
    getLotOperationalSummary(
      orgId,
      id,
      group.landed_cost,
      group.opened_at ?? group.arrival_date ?? group.purchase_date,
      group.total_head,
    ),
    listProcessingEvents(orgId, id),
    listMortalityRecords(orgId, id),
    listLotExpenses(orgId, id),
  ]);

  const canManageCattle = canWriteInventory(session.membership?.system_role);

  return (
    <GroupDetailClient
      orgId={orgId}
      group={group}
      lotSummary={lotSummary}
      processingEvents={processingEvents}
      mortalityRecords={mortalityRecords}
      lotExpenses={lotExpenses}
      expenseCategoryOptions={expenseCategoryOptions}
      adjustmentReasonOptions={adjustmentReasons}
      ownershipOptions={ownershipOptions}
      customerOptions={customerOptions}
      canManageCattle={canManageCattle}
    />
  );
}
