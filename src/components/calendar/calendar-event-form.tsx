"use client";

import { useEffect, useState } from "react";
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
    event ? toLocalDatetimeValue(event.starts_at, event.all_day) : defaultDate ?? "",
  );
  const [endsAt, setEndsAt] = useState(
    event?.ends_at ? toLocalDatetimeValue(event.ends_at, event.all_day) : "",
  );
  const [eventType, setEventType] = useState<CalendarEventType>(event?.event_type ?? "general");
  const [locationId, setLocationId] = useState(event?.location_id ?? "");
  const [groupId, setGroupId] = useState(event?.cattle_group_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!defaultDate || event) return;
    if (!startsAt) setStartsAt(defaultDate);
  }, [defaultDate, event, startsAt]);

  function toIso(local: string, isAllDay: boolean) {
    if (!local) return "";
    if (isAllDay) return `${local.slice(0, 10)}T08:00:00`;
    return new Date(local).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFieldErrors({ title: "Enter an event title" });
      setLoading(false);
      return;
    }

    if (!startsAt) {
      setFieldErrors({ startsAt: "Select a date" });
      setLoading(false);
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() || undefined,
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
          description: description.trim() || null,
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

  const selectClass =
    "flex h-12 min-h-12 w-full rounded-lg border border-border-neutral bg-surface-white px-4 text-base text-text-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-navy">{isEdit ? "Edit event" : "New event"}</CardTitle>
          <CardDescription>
            Schedule ranch activity, deadlines, appointments, and reminders.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Preg check, ship cattle, brand…"
              required
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title ? (
              <p className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="description">Notes (optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex min-h-[5rem] w-full rounded-lg border border-border-neutral bg-surface-white px-4 py-3 text-base"
              placeholder="Details for the crew"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="eventType">Category</Label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className={selectClass}
              >
                {Object.entries(CALENDAR_EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-h-12 items-center gap-2 pt-6">
              <input
                id="allDay"
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-5 w-5 rounded border-border-neutral"
              />
              <Label htmlFor="allDay">All day</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startsAt">{allDay ? "Date" : "Start"}</Label>
              <Input
                id="startsAt"
                type={allDay ? "date" : "datetime-local"}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.startsAt)}
              />
              {fieldErrors.startsAt ? (
                <p className="mt-1 text-sm text-status-critical" role="alert">
                  {fieldErrors.startsAt}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="endsAt">{allDay ? "End date (optional)" : "End (optional)"}</Label>
              <Input
                id="endsAt"
                type={allDay ? "date" : "datetime-local"}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {locationOptions.length > 0 ? (
            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <select
                id="location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={selectClass}
              >
                <option value="">Ranch-wide</option>
                {locationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {groupOptions.length > 0 ? (
            <div>
              <Label htmlFor="group">Cattle group (optional)</Label>
              <select
                id="group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className={selectClass}
              >
                <option value="">None</option>
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

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create Event"}
      </Button>
    </form>
  );
}
