import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { isCalendarEnabled } from "@/lib/org/settings";
import { CalendarPreferencesForm } from "@/components/calendar/calendar-preferences-form";
import { OperationModesForm } from "@/components/setup/operation-modes-form";
import { RanchDetailsForm } from "@/components/setup/ranch-details-form";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Ranch Settings — LAORS",
};

export default async function SetupPreferencesPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const org = session.organization!;
  const calendarEnabled = isCalendarEnabled(session.organization);

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Ranch Settings"
        subtitle="Manage ranch details, preferences, and account settings."
      />
      <RanchDetailsForm
        orgId={orgId}
        initialName={org.name}
        initialAddressLine1={org.address_line1}
        initialAddressLine2={org.address_line2}
        initialCity={org.city}
        initialState={org.state}
        initialZip={org.zip}
        initialPhone={org.phone}
      />
      <OperationModesForm
        orgId={orgId}
        enabledModes={session.organization!.enabled_modes ?? []}
      />
      <CalendarPreferencesForm orgId={orgId} calendarEnabled={calendarEnabled} />
    </ManageSubpageShell>
  );
}
