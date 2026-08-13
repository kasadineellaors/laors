import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listOwners, listOwnerOptions } from "@/lib/owners/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { listFeedRationOptions } from "@/lib/feed/queries";
import { getRationUnitPrices } from "@/lib/feed/inventory-queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { listMedicineOptions } from "@/lib/medicine/queries";
import { toFeedGroupOptions, rationCostsToRecord, ownersToSelectOptions } from "@/lib/feed/options";
import { monthBounds, currentMonthKey } from "@/lib/reports/period";
import { OwnerTotalsReportClient } from "@/components/reports/owner-totals-report-client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Owner Totals — LAORS",
};

export default async function OwnerTotalsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;
  const { start, end } = monthBounds(currentMonthKey());

  const [
    owners,
    groups,
    locationTree,
    feedGroupOptions,
    orgMembers,
    medicineOptions,
    rationOptions,
    feedingOwnerOptions,
    movementReasons,
  ] = await Promise.all([
    listOwners(orgId),
    listCattleGroups(orgId),
    getTreePickerOptions(orgId),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOrgMembers(orgId),
    listMedicineOptions(orgId),
    listFeedRationOptions(orgId),
    listOwnerOptions(orgId).then(ownersToSelectOptions),
    getRanchOptions(orgId, "movement_reasons"),
  ]);

  const rationUnitCosts = rationCostsToRecord(
    await getRationUnitPrices(orgId, rationOptions.map((r) => r.id)),
  );

  const activeGroups = groups.filter((g) => g.total_head > 0);
  const lotOptions = groups.map((g) => ({ id: g.id, name: g.name }));
  const locationOptions = locationTree.flatMap(function flatten(
    node: (typeof locationTree)[number],
  ): Array<{ id: string; label: string }> {
    const self = [{ id: node.id, label: node.name }];
    const kids = (node.children ?? []).flatMap(flatten);
    return [...self, ...kids];
  });

  return (
    <AppPageShell>
      <AppPageHeader
        title="Owner Totals"
        subtitle="Primary owner-level inventory and financial reporting — drill from owner to lot to location."
      />
      <OwnerTotalsReportClient
        orgId={orgId}
        currentUserId={userId}
        ownerOptions={owners}
        lotOptions={lotOptions}
        locationOptions={locationOptions}
        locationTree={locationTree}
        activeGroups={activeGroups}
        groupOptions={feedGroupOptions}
        memberOptions={orgMembers}
        medicineOptions={medicineOptions}
        rationOptions={rationOptions}
        rationUnitCosts={rationUnitCosts}
        feedingOwnerOptions={feedingOwnerOptions}
        movementReasonOptions={movementReasons}
        initialPeriodStart={start}
        initialPeriodEnd={end}
      />
    </AppPageShell>
  );
}
