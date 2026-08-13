import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listOwners } from "@/lib/owners/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
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
  const { start, end } = monthBounds(currentMonthKey());

  const [owners, groups, locationTree] = await Promise.all([
    listOwners(orgId),
    listCattleGroups(orgId),
    getTreePickerOptions(orgId),
  ]);

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
        ownerOptions={owners}
        lotOptions={lotOptions}
        locationOptions={locationOptions}
        initialPeriodStart={start}
        initialPeriodEnd={end}
      />
    </AppPageShell>
  );
}
