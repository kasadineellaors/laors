import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isCalendarEnabled } from "@/lib/org/settings";
import { getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { CalendarEventForm } from "@/components/calendar/calendar-event-form";

export const metadata: Metadata = {
  title: "New Event — LAORS",
};

export default async function NewCalendarEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireOnboardedUser();
  if (!isCalendarEnabled(session.organization)) redirect("/dashboard");

  const orgId = session.organization!.id;
  const { date } = await searchParams;

  const [locations, groups] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({
        value: g.id,
        label: `${g.name} (${g.total_head} hd)`,
      })),
    ),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/calendar" className="text-sm font-medium text-olive hover:underline">
          ← Calendar
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">New event</h1>
      </div>
      <CalendarEventForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        defaultDate={date}
      />
    </div>
  );
}
