import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { isCalendarEnabled } from "@/lib/org/settings";
import { CalendarPreferencesForm } from "@/components/calendar/calendar-preferences-form";

export const metadata: Metadata = {
  title: "Preferences — LAORS",
};

export default async function SetupPreferencesPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) {
    redirect("/setup");
  }

  const orgId = session.organization!.id;
  const calendarEnabled = isCalendarEnabled(session.organization);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← More
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Ranch preferences</h1>
        <p className="text-charcoal/70">Optional features for your operation</p>
      </div>
      <CalendarPreferencesForm orgId={orgId} calendarEnabled={calendarEnabled} />
    </div>
  );
}
