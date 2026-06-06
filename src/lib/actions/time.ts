"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type TimeEntryUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

export type TimeActionState = {
  error?: string;
  success?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE3B.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("time_entries") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateTime() {
  revalidatePath("/time");
  revalidatePath("/time/team");
  revalidatePath("/dashboard");
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
  return { supabase, user };
}

export async function clockIn(orgId: string, notes?: string): Promise<TimeActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("time_entries")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .is("clock_out_at", null)
      .maybeSingle();

    if (existing) return { error: "You are already clocked in" };

    const { error } = await supabase.from("time_entries").insert({
      organization_id: orgId,
      user_id: user.id,
      notes: notes?.trim() || null,
    });

    if (error) return { error: formatDbError(error.message) };
    revalidateTime();
    return { success: "Clocked in" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function clockOut(orgId: string, notes?: string): Promise<TimeActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);

    const { data: open } = await supabase
      .from("time_entries")
      .select("id, notes")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .is("clock_out_at", null)
      .maybeSingle();

    if (!open) return { error: "You are not clocked in" };

    const updates: TimeEntryUpdate = {
      clock_out_at: new Date().toISOString(),
    };
    if (notes?.trim()) {
      updates.notes = open.notes ? `${open.notes}\n${notes.trim()}` : notes.trim();
    }

    const { error } = await supabase
      .from("time_entries")
      .update(updates)
      .eq("id", open.id);

    if (error) return { error: formatDbError(error.message) };
    revalidateTime();
    return { success: "Clocked out" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateTimeEntryNotes(
  orgId: string,
  entryId: string,
  notes: string,
): Promise<TimeActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("time_entries")
      .update({ notes: notes.trim() || null })
      .eq("id", entryId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateTime();
    return { success: "Notes updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
