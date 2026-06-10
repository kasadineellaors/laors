"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type BullUpdate = Database["public"]["Tables"]["individual_animals"]["Update"];

export type BullActionState = {
  error?: string;
  success?: string;
  bullId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE8.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("individual_animals") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateBulls() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/bulls");
}

async function requireManager(orgId: string) {
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

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }
  return { supabase, user };
}

export async function createBull(
  orgId: string,
  input: {
    tagNumber: string;
    name?: string;
    cattleGroupId?: string;
    locationId?: string;
    birthDate?: string;
    notes?: string;
  },
): Promise<BullActionState> {
  const tag = input.tagNumber.trim();
  if (!tag) return { error: "Tag number is required" };

  try {
    const { supabase, user } = await requireManager(orgId);
    const { data, error } = await supabase
      .from("individual_animals")
      .insert({
        organization_id: orgId,
        tag_number: tag,
        name: input.name?.trim() || null,
        animal_type: "bull",
        registry_context: "cow_calf",
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        birth_date: input.birthDate || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateBulls();
    return { success: "Bull added", bullId: data.id };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function updateBull(
  orgId: string,
  bullId: string,
  input: {
    tagNumber?: string;
    name?: string | null;
    cattleGroupId?: string | null;
    locationId?: string | null;
    status?: "active" | "sold" | "dead" | "archived";
    birthDate?: string | null;
    notes?: string | null;
  },
): Promise<BullActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const updates: BullUpdate = {};
    if (input.tagNumber !== undefined) updates.tag_number = input.tagNumber.trim();
    if (input.name !== undefined) updates.name = input.name;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.status !== undefined) updates.status = input.status;
    if (input.birthDate !== undefined) updates.birth_date = input.birthDate;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { error } = await supabase
      .from("individual_animals")
      .update(updates)
      .eq("id", bullId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateBulls();
    return { success: "Bull updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function archiveBull(orgId: string, bullId: string): Promise<BullActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const { error } = await supabase
      .from("individual_animals")
      .update({ is_active: false, status: "archived" })
      .eq("id", bullId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateBulls();
    return { success: "Bull archived" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}
