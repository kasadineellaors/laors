import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { listOwnerOptions } from "@/lib/owners/queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listLotLabelOptions } from "@/lib/lot-labels/queries";
import { CreateGroupForm } from "@/components/inventory/create-group-form";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

export const metadata: Metadata = {
  title: "Receive Lot — LAORS",
};

export default async function NewCattleGroupPage() {
  const session = await requireOnboardedUser();
  if (!canWriteInventory(session.membership?.system_role)) {
    redirect("/cattle");
  }
  const orgId = session.organization!.id;

  const [locationOptions, ownerOptions, lotLabelOptions] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listOwnerOptions(orgId).then((rows) =>
      rows.map((o) => ({
        value: o.id,
        label: o.is_ownership_group ? `${o.name} (group)` : o.name,
      })),
    ),
    listLotLabelOptions(orgId),
  ]);

  return (
    <AppPageShell narrow>
      <AppPageHeader title="Receive lot" backHref="/cattle" backLabel="Lots" />
      <CreateGroupForm
        orgId={orgId}
        locationOptions={locationOptions}
        ownerOptions={ownerOptions}
        lotLabelOptions={lotLabelOptions}
      />
    </AppPageShell>
  );
}
