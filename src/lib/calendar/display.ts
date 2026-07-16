import type { CalendarEventRecord, CalendarEventType } from "./types";
import { CALENDAR_EVENT_TYPE_LABELS } from "./types";

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function eventDateKey(event: CalendarEventRecord): string {
  return event.starts_at.slice(0, 10);
}

export function isTaskOverdue(event: CalendarEventRecord, today = todayIso()): boolean {
  if (event.source !== "task") return false;
  const due = eventDateKey(event);
  return due < today;
}

export function categoryKey(event: CalendarEventRecord): string {
  if (event.source === "task") return "task";
  if (event.source === "breeding") return "breeding";
  return event.event_type;
}

export function categoryLabel(event: CalendarEventRecord): string {
  if (event.source === "task") return "Jobs";
  if (event.source === "breeding") return "Calving";
  return CALENDAR_EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;
}

export const CATEGORY_FILTER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "general", label: "General" },
  { key: "feeding", label: "Feeding" },
  { key: "health", label: "Health" },
  { key: "breeding", label: "Breeding" },
  { key: "calving", label: "Calving" },
  { key: "move", label: "Move" },
  { key: "sale", label: "Sale" },
  { key: "task", label: "Jobs" },
  { key: "other", label: "Other" },
];

/** Subtle left-border / dot colors per category — not full bright fills. */
export const CATEGORY_BORDER: Record<string, string> = {
  general: "border-l-slate",
  feeding: "border-l-[#b8860b]",
  health: "border-l-status-critical",
  breeding: "border-l-[#7b6b9e]",
  calving: "border-l-[#5b8fa8]",
  move: "border-l-[#c47a3a]",
  sale: "border-l-status-success",
  task: "border-l-brown",
  other: "border-l-text-secondary",
};

export const CATEGORY_DOT: Record<string, string> = {
  general: "bg-slate",
  feeding: "bg-[#b8860b]",
  health: "bg-status-critical",
  breeding: "bg-[#7b6b9e]",
  calving: "bg-[#5b8fa8]",
  move: "bg-[#c47a3a]",
  sale: "bg-status-success",
  task: "bg-brown",
  other: "bg-text-secondary",
};

export function eventHref(event: CalendarEventRecord): string {
  if (event.source === "event") return `/calendar/${event.id}`;
  if (event.source === "task") return `/jobs/${event.id.replace("task-", "")}`;
  if (event.source === "breeding") return `/cow-calf/breeding/${event.id.replace("breeding-", "")}`;
  return "#";
}

export function sourceLabel(event: CalendarEventRecord): string | null {
  if (event.source === "task") return "Job due date";
  if (event.source === "breeding") return "Expected calving date";
  if (event.source === "event") return null;
  return null;
}

export function displayTitle(event: CalendarEventRecord): string {
  if (event.source === "task") return event.title.replace(/^Job: /, "");
  return event.title;
}

export function formatEventDate(iso: string, allDay: boolean): string {
  if (allDay) {
    return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(event: CalendarEventRecord): string | null {
  if (event.all_day) return null;
  const d = new Date(event.starts_at);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateKeyFromDate(d: Date): string {
  return dateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks: Date[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function filterEventsByCategories(
  events: CalendarEventRecord[],
  activeCategories: Set<string>,
): CalendarEventRecord[] {
  if (activeCategories.size === 0) return events;
  return events.filter((e) => activeCategories.has(categoryKey(e)));
}

export type AgendaSection = "overdue" | "today" | "tomorrow" | "upcoming";

export function agendaSectionForEvent(
  event: CalendarEventRecord,
  today = todayIso(),
): AgendaSection {
  if (isTaskOverdue(event, today)) return "overdue";
  const key = eventDateKey(event);
  if (key === today) return "today";
  if (key === addDaysIso(today, 1)) return "tomorrow";
  return "upcoming";
}

export const AGENDA_SECTION_LABELS: Record<AgendaSection, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
};

export function groupAgendaEvents(
  events: CalendarEventRecord[],
  today = todayIso(),
): Array<{ section: AgendaSection; events: CalendarEventRecord[] }> {
  const sections: AgendaSection[] = ["overdue", "today", "tomorrow", "upcoming"];
  const sorted = [...events].sort((a, b) => {
    const dateCmp = eventDateKey(a).localeCompare(eventDateKey(b));
    if (dateCmp !== 0) return dateCmp;
    return a.starts_at.localeCompare(b.starts_at);
  });

  return sections
    .map((section) => ({
      section,
      events: sorted.filter((e) => agendaSectionForEvent(e, today) === section),
    }))
    .filter((g) => g.events.length > 0);
}
