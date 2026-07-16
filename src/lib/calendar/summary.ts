import type { CalendarEventRecord } from "./types";
import {
  addDaysIso,
  eventDateKey,
  isTaskOverdue,
  todayIso,
} from "./display";

export interface CalendarSummary {
  today: number;
  next7Days: number;
  overdueJobs: number;
  livestockDates: number;
}

export function computeCalendarSummary(
  events: CalendarEventRecord[],
  today = todayIso(),
): CalendarSummary {
  const weekEnd = addDaysIso(today, 7);

  let todayCount = 0;
  let next7 = 0;
  let overdueJobs = 0;
  let livestock = 0;

  for (const event of events) {
    const date = eventDateKey(event);
    if (date === today) todayCount += 1;
    if (date >= today && date <= weekEnd) next7 += 1;
    if (isTaskOverdue(event, today)) overdueJobs += 1;
    if (event.source === "breeding") livestock += 1;
  }

  return {
    today: todayCount,
    next7Days: next7,
    overdueJobs,
    livestockDates: livestock,
  };
}
