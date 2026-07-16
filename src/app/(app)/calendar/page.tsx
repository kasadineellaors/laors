import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isCalendarEnabled } from "@/lib/org/settings";
import { listCalendarEventsForRange } from "@/lib/calendar/queries";
import { addDaysIso, todayIso } from "@/lib/calendar/display";
import { computeCalendarSummary } from "@/lib/calendar/summary";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import { CalendarSummaryMetrics } from "@/components/calendar/calendar-summary-metrics";
import { CalendarView } from "@/components/calendar/calendar-view";
import { AppPageShell } from "@/components/layout/app-page-shell";

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

  const today = todayIso();
  const agendaStart = addDaysIso(today, -30);
  const agendaEnd = addDaysIso(today, 60);

  const [monthEvents, agendaEvents] = await Promise.all([
    listCalendarEventsForRange(orgId, start, end),
    listCalendarEventsForRange(orgId, agendaStart, agendaEnd, { includeOverdueTasks: true }),
  ]);

  const summary = computeCalendarSummary(agendaEvents, today);
  const showMetrics =
    summary.today > 0 ||
    summary.next7Days > 0 ||
    summary.overdueJobs > 0 ||
    summary.livestockDates > 0;

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const now = new Date();

  return (
    <AppPageShell>
      <CalendarPageHeader />

      {showMetrics ? <CalendarSummaryMetrics summary={summary} /> : null}

      <CalendarView
        year={year}
        month={month}
        monthEvents={monthEvents}
        agendaEvents={agendaEvents}
        prevHref={`/calendar?month=${monthParam(prev.year, prev.month)}`}
        nextHref={`/calendar?month=${monthParam(next.year, next.month)}`}
        todayHref={`/calendar?month=${monthParam(now.getFullYear(), now.getMonth() + 1)}`}
      />
    </AppPageShell>
  );
}
