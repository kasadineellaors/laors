"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar/types";
import { archiveCalendarEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarEventDetailProps {
  orgId: string;
  event: CalendarEventRecord;
}

function formatWhen(event: CalendarEventRecord) {
  const start = new Date(event.starts_at);
  if (event.all_day) {
    return start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return start.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CalendarEventDetail({ orgId, event }: CalendarEventDetailProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this event from the calendar?")) return;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>{formatWhen(event)}</CardDescription>
      </CardHeader>
      <dl className="space-y-3 px-4 pb-4 text-sm">
        <div>
          <dt className="font-semibold text-charcoal/60">Type</dt>
          <dd>{CALENDAR_EVENT_TYPE_LABELS[event.event_type]}</dd>
        </div>
        {event.description ? (
          <div>
            <dt className="font-semibold text-charcoal/60">Notes</dt>
            <dd className="whitespace-pre-wrap">{event.description}</dd>
          </div>
        ) : null}
        {event.location_label ? (
          <div>
            <dt className="font-semibold text-charcoal/60">Location</dt>
            <dd>{event.location_label}</dd>
          </div>
        ) : null}
        {event.cattle_group_name ? (
          <div>
            <dt className="font-semibold text-charcoal/60">Herd</dt>
            <dd>{event.cattle_group_name}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(`/calendar/${event.id}/edit`)}
        >
          Edit
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={handleRemove} disabled={loading}>
          {loading ? "Removing…" : "Remove"}
        </Button>
      </div>
      {error ? <p className="px-4 pb-4 text-sm font-medium text-red-600">{error}</p> : null}
    </Card>
  );
}
