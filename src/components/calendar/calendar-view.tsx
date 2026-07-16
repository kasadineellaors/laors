"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import {
  AGENDA_SECTION_LABELS,
  CATEGORY_BORDER,
  CATEGORY_DOT,
  CATEGORY_FILTER_OPTIONS,
  categoryKey,
  categoryLabel,
  dateKeyFromDate,
  displayTitle,
  eventHref,
  filterEventsByCategories,
  formatEventTime,
  formatShortDate,
  groupAgendaEvents,
  eventDateKey,
  isTaskOverdue,
  monthLabel,
  buildWeeks,
  sourceLabel,
  todayIso,
} from "@/lib/calendar/display";
import { cn } from "@/lib/utils/cn";

type CalendarViewMode = "month" | "agenda";

interface CalendarViewProps {
  year: number;
  month: number;
  monthEvents: CalendarEventRecord[];
  agendaEvents: CalendarEventRecord[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

function EventChip({
  event,
  compact,
}: {
  event: CalendarEventRecord;
  compact?: boolean;
}) {
  const key = categoryKey(event);
  const href = eventHref(event);
  const overdue = isTaskOverdue(event);
  const time = formatEventTime(event);

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-1 rounded border border-border-neutral bg-surface-white px-1.5 py-1 text-navy hover:bg-tan/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
        "border-l-[3px]",
        CATEGORY_BORDER[key] ?? CATEGORY_BORDER.other,
        compact ? "text-[10px] leading-tight" : "text-xs",
        overdue && "ring-1 ring-status-critical/30",
      )}
      title={`${displayTitle(event)}${event.location_label ? ` · ${event.location_label}` : ""}`}
    >
      <span className="truncate font-medium">{displayTitle(event)}</span>
      {time && !compact ? (
        <span className="shrink-0 text-text-secondary">{time}</span>
      ) : null}
    </Link>
  );
}

function DayEventsModal({
  date,
  events,
  onClose,
}: {
  date: string;
  events: CalendarEventRecord[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-events-title"
        className="relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="day-events-title" className="text-lg font-bold text-navy">
            {formatShortDate(date)}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-navy hover:bg-tan/30"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={eventHref(event)}
                className="block rounded-lg border border-border-neutral p-3 hover:bg-tan/20"
                onClick={onClose}
              >
                <p className="font-semibold text-navy">{displayTitle(event)}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{categoryLabel(event)}</p>
                {event.location_label ? (
                  <p className="mt-1 text-sm text-text-secondary">{event.location_label}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={`/calendar/new?date=${date}`}
          className="mt-4 block text-center text-sm font-medium text-brown hover:underline"
          onClick={onClose}
        >
          + New Event on this date
        </Link>
      </div>
    </div>
  );
}

export function CalendarView({
  year,
  month,
  monthEvents,
  agendaEvents,
  prevHref,
  nextHref,
  todayHref,
}: CalendarViewProps) {
  const today = todayIso();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(CATEGORY_FILTER_OPTIONS.map((c) => c.key)),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [overflowDate, setOverflowDate] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) setView("agenda");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setView("agenda");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const filteredMonth = useMemo(
    () => filterEventsByCategories(monthEvents, activeCategories),
    [monthEvents, activeCategories],
  );
  const filteredAgenda = useMemo(
    () => filterEventsByCategories(agendaEvents, activeCategories),
    [agendaEvents, activeCategories],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventRecord[]>();
    for (const event of filteredMonth) {
      const key = event.starts_at.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [filteredMonth]);

  const weeks = buildWeeks(year, month);
  const agendaGroups = groupAgendaEvents(filteredAgenda, today);
  const overflowEvents = overflowDate ? byDay.get(overflowDate) ?? [] : [];

  function toggleCategory(key: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function showAllCategories() {
    setActiveCategories(new Set(CATEGORY_FILTER_OPTIONS.map((c) => c.key)));
  }

  function clearAllCategories() {
    setActiveCategories(new Set());
  }

  const filterPillClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
      active
        ? "bg-navy text-white"
        : "border border-border-neutral bg-surface-white text-navy hover:border-navy/40",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Link
            href={prevHref}
            className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-border-neutral px-3 text-sm font-semibold text-navy hover:bg-tan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            aria-label="Previous month"
          >
            ←
          </Link>
          <Link
            href={todayHref}
            className="flex h-11 items-center justify-center rounded-lg border border-border-neutral px-4 text-sm font-semibold text-navy hover:bg-tan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
          >
            Today
          </Link>
          <Link
            href={nextHref}
            className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-border-neutral px-3 text-sm font-semibold text-navy hover:bg-tan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            aria-label="Next month"
          >
            →
          </Link>
        </div>
        <h2 className="text-center text-lg font-bold text-navy sm:flex-1">{monthLabel(year, month)}</h2>
        <div className="flex justify-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setView("month")}
            className={filterPillClass(view === "month")}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView("agenda")}
            className={filterPillClass(view === "agenda")}
          >
            Agenda
          </button>
        </div>
      </div>

      <div className="hidden sm:block">
        <CategoryFilters
          activeCategories={activeCategories}
          onToggle={toggleCategory}
          onShowAll={showAllCategories}
          onClearAll={clearAllCategories}
        />
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="text-sm font-medium text-brown hover:underline"
        >
          {filtersOpen ? "Hide filters" : "Category filters"}
        </button>
        {filtersOpen ? (
          <div className="mt-3">
            <CategoryFilters
              activeCategories={activeCategories}
              onToggle={toggleCategory}
              onShowAll={showAllCategories}
              onClearAll={clearAllCategories}
            />
          </div>
        ) : null}
      </div>

      {view === "month" ? (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-neutral bg-surface-white shadow-[var(--shadow-card)]">
          <div className="min-w-[320px] sm:min-w-[640px]" role="grid" aria-label="Calendar month view">
            <div className="grid grid-cols-7 border-b border-border-neutral bg-tan/30 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-1 py-2" role="columnheader">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border-neutral last:border-b-0">
                {week.map((day) => {
                  const key = dateKeyFromDate(day);
                  const inMonth = day.getMonth() === month - 1;
                  const dayEvents = byDay.get(key) ?? [];
                  const isToday = key === today;
                  const isSelected = key === selectedDate;

                  return (
                    <div
                      key={key}
                      role="gridcell"
                      className={cn(
                        "min-h-[72px] border-r border-border-neutral p-1 last:border-r-0 sm:min-h-[88px]",
                        inMonth ? "bg-surface-white" : "bg-tan/15",
                        isSelected && "ring-2 ring-inset ring-navy/40",
                      )}
                    >
                      <Link
                        href={`/calendar/new?date=${key}`}
                        onClick={() => setSelectedDate(key)}
                        className={cn(
                          "mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
                          isToday ? "bg-navy text-white" : "text-text-primary hover:bg-tan/40",
                          !inMonth && "text-text-secondary/60",
                        )}
                        aria-label={`${key}${dayEvents.length ? `, ${dayEvents.length} events` : ""}`}
                      >
                        {day.getDate()}
                      </Link>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                          <EventChip key={event.id} event={event} compact />
                        ))}
                        {dayEvents.length > MAX_VISIBLE_EVENTS ? (
                          <button
                            type="button"
                            onClick={() => setOverflowDate(key)}
                            className="px-1 text-[10px] font-medium text-brown hover:underline"
                          >
                            +{dayEvents.length - MAX_VISIBLE_EVENTS} more
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {agendaGroups.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-border-neutral px-6 py-10 text-center text-sm text-text-secondary">
              No upcoming events match your filters.
            </p>
          ) : (
            agendaGroups.map(({ section, events }) => (
              <section key={section}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
                  {AGENDA_SECTION_LABELS[section]}
                </h3>
                <ul className="space-y-2">
                  {events.map((event) => {
                    const overdue = isTaskOverdue(event, today);
                    const src = sourceLabel(event);
                    return (
                      <li key={event.id}>
                        <Link
                          href={eventHref(event)}
                          className={cn(
                            "block rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-4 shadow-[var(--shadow-card)] transition-all",
                            "hover:border-navy/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
                            "border-l-[4px]",
                            CATEGORY_BORDER[categoryKey(event)] ?? CATEGORY_BORDER.other,
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-navy">{displayTitle(event)}</p>
                            {overdue ? (
                              <span className="rounded-full bg-status-critical-bg px-2 py-0.5 text-xs font-semibold text-status-critical">
                                Overdue
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-text-secondary">{categoryLabel(event)}</p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
                            <span>{formatShortDate(eventDateKey(event))}</span>
                            {formatEventTime(event) ? <span>{formatEventTime(event)}</span> : null}
                            {event.location_label ? <span>{event.location_label}</span> : null}
                            {event.cattle_group_name ? <span>{event.cattle_group_name}</span> : null}
                            {event.assigned_to_name ? (
                              <span>Assigned to {event.assigned_to_name}</span>
                            ) : null}
                            {src ? <span>{src}</span> : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {overflowDate && overflowEvents.length > 0 ? (
        <DayEventsModal
          date={overflowDate}
          events={overflowEvents}
          onClose={() => setOverflowDate(null)}
        />
      ) : null}
    </div>
  );
}

function CategoryFilters({
  activeCategories,
  onToggle,
  onShowAll,
  onClearAll,
}: {
  activeCategories: Set<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowAll}
          className="text-xs font-medium text-brown hover:underline"
        >
          Show All
        </button>
        <span className="text-text-secondary">·</span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-brown hover:underline"
        >
          Clear All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTER_OPTIONS.map(({ key, label }) => {
          const active = activeCategories.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
                active
                  ? "bg-navy text-white"
                  : "border border-border-neutral bg-surface-white text-navy",
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[key] ?? CATEGORY_DOT.other)}
                aria-hidden
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
