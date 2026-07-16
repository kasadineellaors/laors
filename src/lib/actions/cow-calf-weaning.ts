"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import {
  animalTypeAfterReplacementWeaning,
  calfStatusAfterWeaning,
  type WeaningMethod,
} from "@/lib/cow-calf/exit-types";
import { endNursingForCalf } from "@/lib/cow-calf/exit-sync";

export type WeaningActionState = {
  error?: string;
  success?: string;
  weaningIds?: string[];
};

const DB_HINT = "Run supabase db push for Phase 38, then retry.";

function revalidateWeaning() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/weaning");
  revalidatePath("/cow-calf/calves");
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

export async function saveCowCalfWeaning(
  orgId: string,
  input: {
    weanedAt?: string;
    weaningMethod?: WeaningMethod;
    cowCalfHerdId?: string;
    destinationHerdId?: string;
    destinationLocationId?: string;
    notes?: string;
    calves: Array<{
      calfId: string;
      weaningWeightLbs?: number;
      retainedAsReplacement?: boolean;
    }>;
  },
): Promise<WeaningActionState> {
  if (!input.calves.length) return { error: "Select at least one calf to wean" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const weanedAt = input.weanedAt ?? new Date().toISOString().slice(0, 10);
    const weaningIds: string[] = [];

    for (const calfInput of input.calves) {
      const { data: calf } = await supabase
        .from("individual_animals")
        .select("id, tag_number, dam_id, cow_calf_herd_id, sex, animal_type, calf_lifecycle_status")
        .eq("id", calfInput.calfId)
        .eq("organization_id", orgId)
        .eq("registry_context", "cow_calf")
        .maybeSingle();

      if (!calf) return { error: "Calf not found" };
      if (calf.calf_lifecycle_status === "weaned" || calf.calf_lifecycle_status === "sold") {
        return { error: `Calf ${calf.tag_number} is already weaned or sold` };
      }

      const damId = calf.dam_id;
      let damTag: string | null = null;
      if (damId) {
        const { data: dam } = await supabase
          .from("individual_animals")
          .select("tag_number")
          .eq("id", damId)
          .maybeSingle();
        damTag = dam?.tag_number ?? null;
      }

      const { data: calving } = await supabase
        .from("calving_records")
        .select("id")
        .eq("organization_id", orgId)
        .eq("calf_id", calf.id)
        .eq("is_active", true)
        .maybeSingle();

      const retained = Boolean(calfInput.retainedAsReplacement);
      const newCalfStatus = calfStatusAfterWeaning(retained);

      const { data: weaningRow, error: weaningError } = await supabase
        .from("weaning_records")
        .insert({
          organization_id: orgId,
          calving_record_id: calving?.id ?? null,
          dam_id: damId,
          calf_id: calf.id,
          calf_tag: calf.tag_number,
          weaned_at: weanedAt,
          weaning_weight_lbs: calfInput.weaningWeightLbs ?? null,
          retained_as_heifer: retained,
          cow_calf_herd_id: input.cowCalfHerdId || calf.cow_calf_herd_id || null,
          destination_herd_id: input.destinationHerdId || null,
          destination_location_id: input.destinationLocationId || null,
          weaning_method: input.weaningMethod ?? null,
          notes: input.notes?.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (weaningError) return { error: `${weaningError.message} — ${DB_HINT}` };
      weaningIds.push(weaningRow.id);

      const animalUpdates: {
        calf_lifecycle_status: string;
        cow_calf_herd_id: string | null;
        location_id: string | null;
        animal_type?: string;
        reproductive_status?: string;
      } = {
        calf_lifecycle_status: newCalfStatus,
        cow_calf_herd_id: input.destinationHerdId || calf.cow_calf_herd_id,
        location_id: input.destinationLocationId || null,
      };

      if (retained) {
        animalUpdates.animal_type = animalTypeAfterReplacementWeaning(calf.sex);
        if (animalUpdates.animal_type === "heifer") {
          animalUpdates.reproductive_status = "replacement_heifer";
        }
      }

      await supabase
        .from("individual_animals")
        .update(animalUpdates)
        .eq("id", calf.id)
        .eq("organization_id", orgId);

      await endNursingForCalf(supabase, orgId, calf.id, weanedAt);
    }

    await logCowCalfActivity({
      organizationId: orgId,
      action: "weaning",
      summary: `Weaned ${input.calves.length} calf${input.calves.length === 1 ? "" : "ves"}.`,
      herdId: input.cowCalfHerdId ?? null,
      sourceTable: "weaning_records",
      sourceId: weaningIds[0],
      userId: user.id,
      details: { calfCount: input.calves.length, weaningIds },
    });

    revalidateWeaning();
    return { success: "Weaning recorded", weaningIds };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCowCalfWeaning(orgId: string, id: string): Promise<WeaningActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("weaning_records")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateWeaning();
    return { success: "Weaning archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
