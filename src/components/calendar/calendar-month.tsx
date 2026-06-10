"use client";

import Link from "next/link";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar/types";
import { cn } from "@/lib/utils/cn";

const TYPE_COLORS: Record<string, string> = {
  general: "bg-olive/20 text-olive border-olive/30",
  feeding: "bg-amber-100 text-amber-900 border-amber-200",
  health: "bg-red-100 text-red-900 border-red-200",
  breeding: "bg-purple-100 text-purple-900 border-purple-200",
  calving: "bg-sky-100 text-sky-900 border-sky-200",
  move: "bg-orange-100 text-orange-900 border-orange-200",
  sale: "bg-emerald-100 text-emerald-900 border-emerald-200",
  other: "bg-charcoal/10 text-charcoal border-charcoal/20",
  task: "bg-tan text-charcoal border-border",
};

interface CalendarMonthProps {
  year: number;
  month: number;
  events: CalendarEventRecord[];
  prevHref: string;
  nextHref: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks: Date[][] = [];
  let cursor = new Date(start);

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

function eventHref(event: CalendarEventRecord) {
  if (event.source === "event") return `/calendar/${event.id}`;
  if (event.source === "task") return `/jobs/${event.id.replace("task-", "")}`;
  if (event.source === "breeding") return `/cow-calf/breeding/${event.id.replace("breeding-", "")}`;
  return "#";
}

export function CalendarMonth({ year, month, events, prevHref, nextHref }: CalendarMonthProps) {
  const weeks = buildWeeks(year, month);
  const byDay = new Map<string, CalendarEventRecord[]>();

  for (const event of events) {
    const key = event.starts_at.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const todayKey = dateKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={prevHref}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-charcoal hover:bg-tan-light/50"
        >
          ← Prev
        </Link>
        <h2 className="text-lg font-bold text-charcoal">{monthLabel(year, month)}</h2>
        <Link
          href={nextHref}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-charcoal hover:bg-tan-light/50"
        >
          Next →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b border-border bg-cream/80 text-center text-xs font-semibold uppercase tracking-wide text-charcoal/60">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-1 py-2">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map((day) => {
                const key = dateKey(day);
                const inMonth = day.getMonth() === month - 1;
                const dayEvents = byDay.get(key) ?? [];
                const isToday = key === todayKey;

                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-[88px] border-r border-border p-1 last:border-r-0",
                      inMonth ? "bg-surface" : "bg-cream/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        isToday ? "bg-olive text-white" : "text-charcoal/70",
                        !inMonth && "text-charcoal/35",
                      )}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const colorKey =
                          event.source === "task"
                            ? "task"
                            : event.source === "breeding"
                              ? "breeding"
                              : event.event_type;
                        const href = eventHref(event);
                        const label =
                          event.source === "event"
                            ? event.title
                            : event.title.replace(/^Job: /, "").slice(0, 24);

                        return (
                          <Link
                            key={event.id}
                            href={href}
                            className={cn(
                              "block truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-tight hover:opacity-80",
                              TYPE_COLORS[colorKey] ?? TYPE_COLORS.other,
                            )}
                            title={`${event.title}${event.location_label ? ` · ${event.location_label}` : ""}`}
                          >
                            {label}
                          </Link>
                        );
                      })}
                      {dayEvents.length > 3 ? (
                        <p className="px-1 text-[10px] text-charcoal/50">+{dayEvents.length - 3} more</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-charcoal/60">
        {Object.entries(CALENDAR_EVENT_TYPE_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              "rounded border px-2 py-0.5 font-medium",
              TYPE_COLORS[key] ?? TYPE_COLORS.other,
            )}
          >
            {label}
          </span>
        ))}
        <span className={cn("rounded border px-2 py-0.5 font-medium", TYPE_COLORS.task)}>
          Jobs (due dates)
        </span>
      </div>
    </div>
  );
}
