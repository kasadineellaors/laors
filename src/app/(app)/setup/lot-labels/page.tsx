import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { listLotLabelOptions } from "@/lib/lot-labels/queries";
import { LotLabelsClient } from "@/components/setup/lot-labels-client";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Lot Names — LAORS",
};

export default async function LotLabelsSetupPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const items = await listLotLabelOptions(orgId);

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Lot names"
        subtitle="Manage saved lot names used when receiving cattle."
      />
      <LotLabelsClient orgId={orgId} items={items} />
    </ManageSubpageShell>
  );
}
