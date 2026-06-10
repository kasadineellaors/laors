import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isCalendarEnabled } from "@/lib/org/settings";
import { getCalendarEvent } from "@/lib/calendar/queries";
import { CalendarEventDetail } from "@/components/calendar/calendar-event-detail";

export const metadata: Metadata = {
  title: "Event — LAORS",
};

export default async function CalendarEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOnboardedUser();
  if (!isCalendarEnabled(session.organization)) redirect("/dashboard");

  const orgId = session.organization!.id;
  const { id } = await params;
  const event = await getCalendarEvent(orgId, id);
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/calendar" className="text-sm font-medium text-olive hover:underline">
          ← Calendar
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Event</h1>
      </div>
      <CalendarEventDetail orgId={orgId} event={event} />
    </div>
  );
}
