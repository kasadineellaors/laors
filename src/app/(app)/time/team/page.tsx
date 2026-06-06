import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canViewTeamTime } from "@/lib/auth/roles";
import { listOpenClockIns, listTeamTimeEntries } from "@/lib/time/queries";
import { TeamTimeClient } from "@/components/time/team-time-client";

export const metadata: Metadata = {
  title: "Team Time — LAORS",
};

export default async function TeamTimePage() {
  const session = await requireOnboardedUser();
  const role = session.membership?.system_role;

  if (!canViewTeamTime(role)) {
    redirect("/time");
  }

  const orgId = session.organization!.id;
  const [openEntries, recentEntries] = await Promise.all([
    listOpenClockIns(orgId),
    listTeamTimeEntries(orgId),
  ]);

  return <TeamTimeClient openEntries={openEntries} recentEntries={recentEntries} />;
}
