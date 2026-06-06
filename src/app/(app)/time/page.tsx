import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canViewTeamTime } from "@/lib/auth/roles";
import { getClockStatus, listRecentTimeEntries } from "@/lib/time/queries";
import { ClockClient } from "@/components/time/clock-client";

export const metadata: Metadata = {
  title: "Time Clock — LAORS",
};

export default async function TimeClockPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const [status, recentEntries] = await Promise.all([
    getClockStatus(orgId, userId),
    listRecentTimeEntries(orgId, userId),
  ]);

  const showTeamLink = canViewTeamTime(session.membership?.system_role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Time clock</h1>
        <p className="text-charcoal/70">Clock in when you start, out when you finish</p>
      </div>
      <ClockClient
        orgId={orgId}
        status={status}
        recentEntries={recentEntries}
        showTeamLink={showTeamLink}
      />
    </div>
  );
}
