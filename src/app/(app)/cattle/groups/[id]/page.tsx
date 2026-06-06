import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listCustomerOptions } from "@/lib/customers/queries";
import { canWriteInventory } from "@/lib/auth/roles";
import { getCattleGroup } from "@/lib/inventory/queries";
import { getRanchOptions } from "@/lib/locations/options";
import { GroupDetailClient } from "@/components/inventory/group-detail-client";

export const metadata: Metadata = {
  title: "Cattle Group — LAORS",
};

export default async function CattleGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [group, adjustmentReasons, ownershipOptions, customerOptions] = await Promise.all([
    getCattleGroup(orgId, id),
    getRanchOptions(orgId, "adjustment_reasons"),
    getRanchOptions(orgId, "ownership_groups"),
    listCustomerOptions(orgId).then((rows) =>
      rows.map((c) => ({ value: c.id, label: c.name })),
    ),
  ]);

  if (!group) notFound();

  const canManageCattle = canWriteInventory(session.membership?.system_role);

  return (
    <GroupDetailClient
      orgId={orgId}
      group={group}
      adjustmentReasonOptions={adjustmentReasons}
      ownershipOptions={ownershipOptions}
      customerOptions={customerOptions}
      canManageCattle={canManageCattle}
    />
  );
}
