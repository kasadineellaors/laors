"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { CalendarEventRecord, CalendarEventType } from "@/lib/calendar/types";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar/types";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarEventFormProps {
  orgId: string;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  event?: CalendarEventRecord;
  defaultDate?: string;
}

function toLocalDatetimeValue(iso: string, allDay: boolean) {
  if (allDay) return iso.slice(0, 10);
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarEventForm({
  orgId,
  locationOptions,
  groupOptions,
  event,
  defaultDate,
}: CalendarEventFormProps) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? true);
  const [startsAt, setStartsAt] = useState(
    event
      ? toLocalDatetimeValue(event.starts_at, event.all_day)
      : defaultDate ?? "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.ends_at ? toLocalDatetimeValue(event.ends_at, event.all_day) : "",
  );
  const [eventType, setEventType] = useState<CalendarEventType>(event?.event_type ?? "general");
  const [locationId, setLocationId] = useState(event?.location_id ?? "");
  const [groupId, setGroupId] = useState(event?.cattle_group_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toIso(local: string, isAllDay: boolean) {
    if (!local) return "";
    if (isAllDay) return `${local.slice(0, 10)}T08:00:00`;
    return new Date(local).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      allDay,
      startsAt: toIso(startsAt, allDay),
      endsAt: endsAt ? toIso(endsAt, allDay) : undefined,
      eventType,
      locationId: locationId || undefined,
      cattleGroupId: groupId || undefined,
    };

    const result = isEdit
      ? await updateCalendarEvent(orgId, event!.id, {
          ...payload,
          description: description || null,
          endsAt: endsAt ? toIso(endsAt, allDay) : null,
          locationId: locationId || null,
          cattleGroupId: groupId || null,
        })
      : await createCalendarEvent(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.eventId) {
      router.push(`/calendar/${result.eventId}`);
    } else if (isEdit) {
      router.push(`/calendar/${event!.id}`);
    } else {
      router.push("/calendar");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit event" : "New calendar event"}</CardTitle>
          <CardDescription>
            Shared with everyone on the ranch — vet visits, shipping, pasture moves, and more.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="preg check, ship cattle, brand…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Optional details for the crew"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventType">Type</Label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {Object.entries(CALENDAR_EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="allDay"
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="allDay">All day</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts</Label>
              <Input
                id="startsAt"
                type={allDay ? "date" : "datetime-local"}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends (optional)</Label>
              <Input
                id="endsAt"
                type={allDay ? "date" : "datetime-local"}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {locationOptions.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">— Any / not set —</option>
                {locationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {groupOptions.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="group">Herd / group</Label>
              <select
                id="group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">— Not set —</option>
                {groupOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Card>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
