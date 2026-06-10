"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { CalendarEventType } from "@/lib/calendar/types";
import type { OrgSettings } from "@/lib/org/settings";

type EventUpdate = Database["public"]["Tables"]["calendar_events"]["Update"];

export type CalendarActionState = {
  error?: string;
  success?: string;
  eventId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE13.sql or supabase db push, then retry.";

function revalidateCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/setup/preferences");
  revalidatePath("/", "layout");
}

async function requireMember(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) throw new Error("Not authorized");
  return { supabase, user, role: member.system_role };
}

export async function createCalendarEvent(
  orgId: string,
  input: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    allDay?: boolean;
    eventType?: CalendarEventType;
    locationId?: string;
    cattleGroupId?: string;
  },
): Promise<CalendarActionState> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        organization_id: orgId,
        title,
        description: input.description?.trim() || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt || null,
        all_day: input.allDay ?? false,
        event_type: input.eventType ?? "general",
        location_id: input.locationId || null,
        cattle_group_id: input.cattleGroupId || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateCalendar();
    return { success: "Event added", eventId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateCalendarEvent(
  orgId: string,
  eventId: string,
  input: {
    title?: string;
    description?: string | null;
    startsAt?: string;
    endsAt?: string | null;
    allDay?: boolean;
    eventType?: CalendarEventType;
    locationId?: string | null;
    cattleGroupId?: string | null;
  },
): Promise<CalendarActionState> {
  try {
    await requireMember(orgId);
    const supabase = await createClient();
    const updates: EventUpdate = {};
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description?.trim() || null;
    if (input.startsAt !== undefined) updates.starts_at = input.startsAt;
    if (input.endsAt !== undefined) updates.ends_at = input.endsAt;
    if (input.allDay !== undefined) updates.all_day = input.allDay;
    if (input.eventType !== undefined) updates.event_type = input.eventType;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;

    const { error } = await supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", eventId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateCalendar();
    return { success: "Event updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCalendarEvent(
  orgId: string,
  eventId: string,
): Promise<CalendarActionState> {
  try {
    await requireMember(orgId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("calendar_events")
      .update({ is_active: false })
      .eq("id", eventId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateCalendar();
    return { success: "Event removed" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateOrgPreferences(
  orgId: string,
  input: { calendarEnabled?: boolean },
): Promise<CalendarActionState> {
  try {
    const { supabase, role } = await requireMember(orgId);
    if (!["owner", "manager"].includes(role)) {
      return { error: "Managers only" };
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .maybeSingle();

    const settings = (org?.settings as OrgSettings) ?? {};
    const next: OrgSettings = {
      ...settings,
      ...(input.calendarEnabled !== undefined
        ? { calendar_enabled: input.calendarEnabled }
        : {}),
    };

    const { error } = await supabase
      .from("organizations")
      .update({ settings: next })
      .eq("id", orgId);

    if (error) return { error: error.message };
    revalidateCalendar();
    revalidatePath("/setup");
    return { success: "Preferences saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
