import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import { listBreedingRecords } from "@/lib/cow-calf/breeding-queries";
import { PREGNANCY_STATUS_LABELS } from "@/lib/cow-calf/constants";
import { listTasks } from "@/lib/tasks/queries";
import type { CalendarEventRecord } from "./types";

const DB_HINT = "Run supabase/RUN_PHASE13.sql or supabase db push, then retry.";

export async function listCalendarEventsForRange(
  orgId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarEventRecord[]> {
  const supabase = await createClient();
  const items: CalendarEventRecord[] = [];

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .gte("starts_at", `${rangeStart}T00:00:00`)
    .lte("starts_at", `${rangeEnd}T23:59:59`)
    .order("starts_at");

  if (error && !error.message.includes("calendar_events")) {
    throw new Error(`${error.message} — ${DB_HINT}`);
  }

  if (events?.length) {
    const groupIds = [...new Set(events.map((e) => e.cattle_group_id).filter(Boolean))] as string[];
    const locationIds = [...new Set(events.map((e) => e.location_id).filter(Boolean))] as string[];

    const [{ data: groups }, { data: locations }] = await Promise.all([
      groupIds.length
        ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] }),
      locationIds.length
        ? supabase.from("locations").select("id, name, parent_id, depth, path").in("id", locationIds)
        : Promise.resolve({ data: [] }),
    ]);

    const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
    const locRows = (locations ?? []) as LocationRow[];
    const allLocs =
      locRows.length > 0
        ? (
            await supabase
              .from("locations")
              .select("id, name, parent_id, depth, path")
              .eq("organization_id", orgId)
              .eq("is_active", true)
          ).data ?? []
        : [];
    const locMap = new Map(
      locRows.map((l) => [
        l.id,
        getBreadcrumb(l.id, allLocs as LocationRow[])
          .map((x) => x.name)
          .join(" › "),
      ]),
    );

    for (const e of events) {
      items.push({
        id: e.id,
        title: e.title,
        description: e.description,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        all_day: e.all_day,
        event_type: e.event_type as CalendarEventRecord["event_type"],
        location_id: e.location_id,
        location_label: e.location_id ? locMap.get(e.location_id) ?? null : null,
        cattle_group_id: e.cattle_group_id,
        cattle_group_name: e.cattle_group_id ? groupMap.get(e.cattle_group_id) ?? null : null,
        color: e.color,
        created_by: e.created_by,
        created_by_name: null,
        editable: true,
        source: "event",
      });
    }
  }

  const tasks = await listTasks(orgId, "all");
  for (const t of tasks) {
    if (!t.due_date || t.due_date < rangeStart || t.due_date > rangeEnd) continue;
    if (t.status === "done" || t.status === "cancelled") continue;
    items.push({
      id: `task-${t.id}`,
      title: `Job: ${t.title}`,
      description: t.description,
      starts_at: `${t.due_date}T09:00:00`,
      ends_at: null,
      all_day: true,
      event_type: "general",
      location_id: t.location_id,
      location_label: t.location_label,
      cattle_group_id: t.cattle_group_id,
      cattle_group_name: t.cattle_group_name,
      color: null,
      created_by: t.created_by,
      created_by_name: t.created_by_name,
      editable: false,
      source: "task",
    });
  }

  const breeding = await listBreedingRecords(orgId);
  for (const b of breeding) {
    if (!b.expected_calving_date) continue;
    if (b.expected_calving_date < rangeStart || b.expected_calving_date > rangeEnd) continue;
    if (b.pregnancy_status === "open") continue;
    items.push({
      id: `breeding-${b.id}`,
      title: `Calving due: ${b.dam_tag ?? "Dam"}`,
      description: `${PREGNANCY_STATUS_LABELS[b.pregnancy_status]} · ${b.cattle_group_name ?? ""}`,
      starts_at: `${b.expected_calving_date}T08:00:00`,
      ends_at: null,
      all_day: true,
      event_type: "breeding",
      location_id: b.location_id,
      location_label: b.location_name,
      cattle_group_id: b.cattle_group_id,
      cattle_group_name: b.cattle_group_name,
      color: null,
      created_by: null,
      created_by_name: null,
      editable: false,
      source: "breeding",
    });
  }

  return items.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function getCalendarEvent(
  orgId: string,
  id: string,
): Promise<CalendarEventRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`${error.message} — ${DB_HINT}`);
  if (!data) return null;

  const day = data.starts_at.slice(0, 10);
  const items = await listCalendarEventsForRange(orgId, day, day);
  return items.find((item) => item.source === "event" && item.id === id) ?? null;
}
