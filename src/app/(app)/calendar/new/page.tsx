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

  const defaultDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <Link href="/calendar" className="text-sm font-medium text-brown hover:underline">
          ← Calendar
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          New event
        </h1>
      </div>
      <CalendarEventForm
        orgId={orgId}
        locationOptions={locations}
        groupOptions={groups}
        defaultDate={defaultDate}
      />
    </div>
  );
}
