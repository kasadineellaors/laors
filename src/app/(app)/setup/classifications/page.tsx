import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { ClassificationsList } from "@/components/setup/classifications-list";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Cattle Types — LAORS",
};

export default async function ClassificationsSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const classifications = await getRanchOptions(orgId, "classifications");

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Cattle Types"
        subtitle="Customize cattle classes such as cow, calf, bull, steer, heifer, and stocker."
      />
      <ClassificationsList orgId={orgId} classifications={classifications} />
    </ManageSubpageShell>
  );
}
