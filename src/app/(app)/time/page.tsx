import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canViewTeamTime } from "@/lib/auth/roles";
import { getClockStatus, listRecentTimeEntries } from "@/lib/time/queries";
import { ClockClient } from "@/components/time/clock-client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { AppPageShell } from "@/components/layout/app-page-shell";

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
    <AppPageShell>
      <AppPageHeader
        title="Time Clock"
        subtitle="Clock in when you start, out when you finish."
      />
      <ClockClient
        orgId={orgId}
        status={status}
        recentEntries={recentEntries}
        showTeamLink={showTeamLink}
      />
    </AppPageShell>
  );
}
