"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { CowAnimalType } from "@/lib/cow-calf/types";

type CowUpdate = Database["public"]["Tables"]["individual_animals"]["Update"];

export type CowActionState = {
  error?: string;
  success?: string;
  cowId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE8.sql and RUN_PHASE12.sql, then retry.";

function formatDbError(message: string): string {
  if (message.includes("individual_animals") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateCows() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/cows");
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

export async function createCow(
  orgId: string,
  input: {
    tagNumber: string;
    animalType?: CowAnimalType;
    name?: string;
    cattleGroupId?: string;
    locationId?: string;
    birthDate?: string;
    notes?: string;
  },
): Promise<CowActionState> {
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
        animal_type: input.animalType ?? "cow",
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
    revalidateCows();
    return { success: "Cow registered", cowId: data.id };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function updateCow(
  orgId: string,
  cowId: string,
  input: {
    tagNumber?: string;
    animalType?: CowAnimalType;
    name?: string | null;
    cattleGroupId?: string | null;
    locationId?: string | null;
    status?: "active" | "sold" | "dead" | "archived";
    birthDate?: string | null;
    notes?: string | null;
  },
): Promise<CowActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const updates: CowUpdate = {};
    if (input.tagNumber !== undefined) updates.tag_number = input.tagNumber.trim();
    if (input.animalType !== undefined) updates.animal_type = input.animalType;
    if (input.name !== undefined) updates.name = input.name;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.status !== undefined) updates.status = input.status;
    if (input.birthDate !== undefined) updates.birth_date = input.birthDate;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { error } = await supabase
      .from("individual_animals")
      .update(updates)
      .eq("id", cowId)
      .eq("organization_id", orgId)
      .in("animal_type", ["cow", "heifer"]);

    if (error) return { error: formatDbError(error.message) };
    revalidateCows();
    revalidatePath(`/cow-calf/cows/${cowId}`);
    return { success: "Cow updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function archiveCow(orgId: string, cowId: string): Promise<CowActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const { error } = await supabase
      .from("individual_animals")
      .update({ is_active: false, status: "archived" })
      .eq("id", cowId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateCows();
    return { success: "Cow archived" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}
