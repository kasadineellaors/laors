import { createClient } from "@/lib/supabase/server";
import type { ClockStatus, TimeEntryRecord } from "./types";

function durationMinutes(clockIn: string, clockOut: string | null): number | null {
  if (!clockOut) return null;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return Math.round(ms / 60000);
}

async function enrichEntries(
  entries: Array<Record<string, unknown>>,
): Promise<TimeEntryRecord[]> {
  const supabase = await createClient();
  const userIds = [...new Set(entries.map((e) => e.user_id))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const names = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "Team member"]),
  );

  return entries.map((e) => ({
    id: e.id as string,
    user_id: e.user_id as string,
    user_name: names.get(e.user_id as string) ?? "Team member",
    clock_in_at: e.clock_in_at as string,
    clock_out_at: (e.clock_out_at as string | null) ?? null,
    notes: (e.notes as string | null) ?? null,
    duration_minutes: durationMinutes(
      e.clock_in_at as string,
      (e.clock_out_at as string | null) ?? null,
    ),
  }));
}

export async function getClockStatus(orgId: string, userId: string): Promise<ClockStatus> {
  const supabase = await createClient();
  const { data: open } = await supabase
    .from("time_entries")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (!open) return { isClockedIn: false, openEntry: null };

  const [entry] = await enrichEntries([open]);
  return { isClockedIn: true, openEntry: entry ?? null };
}

export async function listRecentTimeEntries(
  orgId: string,
  userId: string,
  limit = 10,
): Promise<TimeEntryRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("time_entries")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .order("clock_in_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];
  return enrichEntries(rows);
}

export async function listTeamTimeEntries(
  orgId: string,
  limit = 50,
): Promise<TimeEntryRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("time_entries")
    .select("*")
    .eq("organization_id", orgId)
    .order("clock_in_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];
  return enrichEntries(rows);
}

export async function listOpenClockIns(orgId: string): Promise<TimeEntryRecord[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("time_entries")
    .select("*")
    .eq("organization_id", orgId)
    .is("clock_out_at", null)
    .order("clock_in_at", { ascending: true });

  if (!rows?.length) return [];
  return enrichEntries(rows);
}
