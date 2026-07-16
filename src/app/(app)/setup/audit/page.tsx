import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { listAuditLog } from "@/lib/audit/queries";
import { AuditLogList } from "@/components/audit/audit-log-list";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Activity Log — LAORS",
};

export default async function SetupAuditPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const entries = await listAuditLog(orgId, 150);

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Activity Log"
        subtitle="See who created, changed, moved, sold, or exported records."
      />
      <AuditLogList entries={entries} />
    </ManageSubpageShell>
  );
}
