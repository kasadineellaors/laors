"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type RainfallUpdate = Database["public"]["Tables"]["rainfall_records"]["Update"];

export type RainfallActionState = {
  error?: string;
  success?: string;
  recordId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE3B.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("rainfall_records") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateRainfall() {
  revalidatePath("/weather/rainfall");
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

export async function createRainfallRecord(
  orgId: string,
  input: {
    amountInches: number;
    recordedDate?: string;
    locationId?: string;
    notes?: string;
  },
): Promise<RainfallActionState> {
  if (input.amountInches < 0) return { error: "Amount must be zero or greater" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const { data, error } = await supabase
      .from("rainfall_records")
      .insert({
        organization_id: orgId,
        amount_inches: input.amountInches,
        recorded_date: input.recordedDate || new Date().toISOString().slice(0, 10),
        location_id: input.locationId || null,
        notes: input.notes?.trim() || null,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateRainfall();
    return { success: "Rainfall logged", recordId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateRainfallRecord(
  orgId: string,
  recordId: string,
  input: {
    amountInches?: number;
    recordedDate?: string;
    locationId?: string | null;
    notes?: string | null;
  },
): Promise<RainfallActionState> {
  if (input.amountInches !== undefined && input.amountInches < 0) {
    return { error: "Amount must be zero or greater" };
  }

  try {
    const { supabase } = await requireMember(orgId);

    const updates: RainfallUpdate = {};
    if (input.amountInches !== undefined) updates.amount_inches = input.amountInches;
    if (input.recordedDate !== undefined) updates.recorded_date = input.recordedDate;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabase
      .from("rainfall_records")
      .update(updates)
      .eq("id", recordId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateRainfall();
    revalidatePath(`/weather/rainfall/${recordId}`);
    return { success: "Rainfall updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveRainfallRecord(
  orgId: string,
  recordId: string,
): Promise<RainfallActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("rainfall_records")
      .update({ is_active: false })
      .eq("id", recordId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateRainfall();
    return { success: "Record archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
