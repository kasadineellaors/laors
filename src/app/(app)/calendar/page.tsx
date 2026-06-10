import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isCalendarEnabled } from "@/lib/org/settings";
import { listCalendarEventsForRange } from "@/lib/calendar/queries";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Calendar — LAORS",
};

function parseMonth(search: { month?: string }) {
  const now = new Date();
  if (!search.month || !/^\d{4}-\d{2}$/.test(search.month)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = search.month.split("-").map(Number);
  return { year: y, month: m };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthRange(year: number, month: number) {
  const start = `${monthParam(year, month)}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${monthParam(year, month)}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireOnboardedUser();
  if (!isCalendarEnabled(session.organization)) redirect("/dashboard");

  const orgId = session.organization!.id;
  const { month: monthQuery } = await searchParams;
  const { year, month } = parseMonth({ month: monthQuery });
  const { start, end } = monthRange(year, month);
  const events = await listCalendarEventsForRange(orgId, start, end);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Calendar</h1>
          <p className="text-charcoal/70">
            Ranch schedule — events, job due dates, and calving due dates
          </p>
        </div>
        <Link href="/calendar/new">
          <Button size="lg">+ Event</Button>
        </Link>
      </div>

      <CalendarMonth
        year={year}
        month={month}
        events={events}
        prevHref={`/calendar?month=${monthParam(prev.year, prev.month)}`}
        nextHref={`/calendar?month=${monthParam(next.year, next.month)}`}
      />
    </div>
  );
}
