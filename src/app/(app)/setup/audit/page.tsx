import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { listAuditLog } from "@/lib/audit/queries";
import { AuditLogList } from "@/components/audit/audit-log-list";

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
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← More
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Activity log</h1>
        <p className="text-charcoal/70">
          Who did what — cattle moves, lots, sales, and closeout emails
        </p>
      </div>

      <AuditLogList entries={entries} />
    </div>
  );
}
