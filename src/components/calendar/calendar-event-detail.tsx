"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar/types";
import {
  categoryLabel,
  displayTitle,
  eventHref,
  formatEventDate,
  formatEventTime,
  sourceLabel,
} from "@/lib/calendar/display";
import { archiveCalendarEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface CalendarEventDetailProps {
  orgId: string;
  event: CalendarEventRecord;
}

export function CalendarEventDetail({ orgId, event }: CalendarEventDetailProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSourceGenerated = !event.editable;
  const src = sourceLabel(event);

  async function handleRemove() {
    if (!confirm("Remove this event from the calendar? This cannot be undone.")) return;
    setLoading(true);
    const result = await archiveCalendarEvent(orgId, event.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/calendar");
    router.refresh();
  }

  if (isSourceGenerated) {
    const href = eventHref(event);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-navy">{displayTitle(event)}</CardTitle>
          <CardDescription>{formatEventDate(event.starts_at, event.all_day)}</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-1 pb-2">
          <div
            className="rounded-lg border border-status-info/30 bg-status-info-bg px-4 py-3 text-sm text-text-primary"
            role="status"
          >
            <p className="font-semibold text-navy">Source: {src}</p>
            <p className="mt-1">
              {event.source === "task"
                ? "This date comes from a task. Edit the task to change it."
                : "This date comes from a breeding record. Edit the breeding record to change it."}
            </p>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-text-secondary">Category</dt>
              <dd className="font-medium text-text-primary">{categoryLabel(event)}</dd>
            </div>
            {event.location_label ? (
              <div>
                <dt className="text-text-secondary">Location</dt>
                <dd className="font-medium text-text-primary">{event.location_label}</dd>
              </div>
            ) : null}
            {event.cattle_group_name ? (
              <div>
                <dt className="text-text-secondary">Cattle group</dt>
                <dd className="font-medium text-text-primary">{event.cattle_group_name}</dd>
              </div>
            ) : null}
            {event.assigned_to_name ? (
              <div>
                <dt className="text-text-secondary">Assigned to</dt>
                <dd className="font-medium text-text-primary">{event.assigned_to_name}</dd>
              </div>
            ) : null}
          </dl>
          {href !== "#" ? (
            <Link href={href}>
              <Button size="lg" fullWidth>
                View source record
              </Button>
            </Link>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">{event.title}</CardTitle>
        <CardDescription>{formatEventDate(event.starts_at, event.all_day)}</CardDescription>
      </CardHeader>
      <dl className="space-y-3 px-1 pb-2 text-sm">
        <div>
          <dt className="text-text-secondary">Category</dt>
          <dd className="font-medium text-text-primary">
            {CALENDAR_EVENT_TYPE_LABELS[event.event_type]}
          </dd>
        </div>
        {!event.all_day && formatEventTime(event) ? (
          <div>
            <dt className="text-text-secondary">Time</dt>
            <dd className="font-medium text-text-primary">{formatEventTime(event)}</dd>
          </div>
        ) : null}
        {event.description ? (
          <div>
            <dt className="text-text-secondary">Notes</dt>
            <dd className="whitespace-pre-wrap text-text-primary">{event.description}</dd>
          </div>
        ) : null}
        {event.location_label ? (
          <div>
            <dt className="text-text-secondary">Location</dt>
            <dd className="font-medium text-text-primary">{event.location_label}</dd>
          </div>
        ) : null}
        {event.cattle_group_name ? (
          <div>
            <dt className="text-text-secondary">Cattle group</dt>
            <dd className="font-medium text-text-primary">{event.cattle_group_name}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-border-neutral pt-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(`/calendar/${event.id}/edit`)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className={cn("text-status-critical")}
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? "Removing…" : "Delete"}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
