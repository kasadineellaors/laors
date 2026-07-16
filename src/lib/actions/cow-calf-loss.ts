"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import type { LossCause } from "@/lib/cow-calf/exit-types";
import { endNursingForCalf, markAnimalDeceased } from "@/lib/cow-calf/exit-sync";

export type LossActionState = {
  error?: string;
  success?: string;
  lossId?: string;
};

const DB_HINT = "Run supabase db push for Phase 38, then retry.";

function revalidateLoss() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/cows");
  revalidatePath("/cow-calf/calves");
  revalidatePath("/cow-calf/bulls");
  revalidatePath("/cow-calf/herds");
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

export async function saveCowCalfLoss(
  orgId: string,
  input: {
    animalId: string;
    lossDate?: string;
    cause?: LossCause;
    cowCalfHerdId?: string;
    locationId?: string;
    disposalMethod?: string;
    notes?: string;
  },
): Promise<LossActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    const lossDate = input.lossDate ?? new Date().toISOString().slice(0, 10);

    const { data: animal } = await supabase
      .from("individual_animals")
      .select("id, tag_number, name, animal_type, dam_id, cow_calf_herd_id")
      .eq("id", input.animalId)
      .eq("organization_id", orgId)
      .eq("registry_context", "cow_calf")
      .maybeSingle();

    if (!animal) return { error: "Animal not found" };
    if (animal.animal_type && ["cow", "heifer", "bull", "other"].includes(animal.animal_type) === false) {
      return { error: "Animal type not supported for loss recording" };
    }

    const { data: lossRow, error: lossError } = await supabase
      .from("cow_calf_loss_records")
      .insert({
        organization_id: orgId,
        individual_animal_id: animal.id,
        cow_calf_herd_id: input.cowCalfHerdId || animal.cow_calf_herd_id || null,
        loss_date: lossDate,
        cause: input.cause ?? "unknown",
        location_id: input.locationId || null,
        disposal_method: input.disposalMethod?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (lossError) return { error: `${lossError.message} — ${DB_HINT}` };

    await markAnimalDeceased(supabase, orgId, animal.id, animal.animal_type);

    if (animal.animal_type === "other") {
      await endNursingForCalf(supabase, orgId, animal.id, lossDate);
    }

    await logCowCalfActivity({
      organizationId: orgId,
      action: "death_loss",
      summary: `Death/loss recorded for ${animal.tag_number}.`,
      herdId: input.cowCalfHerdId || animal.cow_calf_herd_id,
      animalId: animal.id,
      sourceTable: "cow_calf_loss_records",
      sourceId: lossRow.id,
      userId: user.id,
      details: { cause: input.cause ?? "unknown" },
    });

    revalidateLoss();
    return { success: "Loss recorded", lossId: lossRow.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCowCalfLoss(orgId: string, lossId: string): Promise<LossActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("cow_calf_loss_records")
      .update({ is_active: false })
      .eq("id", lossId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateLoss();
    return { success: "Loss record archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
