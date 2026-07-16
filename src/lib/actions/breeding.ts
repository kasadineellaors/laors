"use server";

import { createClient } from "@/lib/supabase/server";
import { expectedCalvingFromBredDate } from "@/lib/cow-calf/constants";
import type {
  BreedingContext,
  BreedingMethod,
  PregnancyStatus,
} from "@/lib/cow-calf/breeding-types";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import {
  pregnancyStatusToReproductiveStatus,
} from "@/lib/cow-calf/reproduction-helpers";
import type { ReproductiveStatus } from "@/lib/cow-calf/inventory-calculations";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type BreedingUpdate = Database["public"]["Tables"]["breeding_records"]["Update"];

export type BreedingActionState = {
  error?: string;
  success?: string;
  breedingId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE9.sql in Supabase SQL Editor, then retry.";

function revalidateBreeding(context: BreedingContext = "cow_calf") {
  if (context === "seedstock") {
    revalidatePath("/seedstock");
    revalidatePath("/seedstock/breeding");
  } else {
    revalidatePath("/cow-calf");
    revalidatePath("/cow-calf/breeding");
    revalidatePath("/cow-calf/exposure");
  }
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

async function syncDamReproductiveStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  damId: string,
  status: ReproductiveStatus,
) {
  await supabase
    .from("individual_animals")
    .update({ reproductive_status: status })
    .eq("id", damId)
    .eq("organization_id", orgId);
}

export async function createBreeding(
  orgId: string,
  input: {
    bredAt?: string;
    breedingContext?: BreedingContext;
    cattleGroupId?: string;
    cowCalfHerdId?: string;
    locationId?: string;
    damId?: string;
    damTag?: string;
    bullId?: string;
    sireTag?: string;
    embryoDonorTag?: string;
    embryoRecipientTag?: string;
    breedingMethod?: BreedingMethod;
    expectedCalvingDate?: string;
    pregnancyStatus?: PregnancyStatus;
    pregnancyCheckDate?: string;
    notes?: string;
  },
): Promise<BreedingActionState> {
  const context = input.breedingContext ?? "cow_calf";
  try {
    const { supabase, user } = await requireMember(orgId);
    const bredAt = input.bredAt ?? new Date().toISOString().slice(0, 10);

    let sireTag = input.sireTag?.trim() || null;
    if (input.bullId && !sireTag) {
      const { data: bull } = await supabase
        .from("individual_animals")
        .select("tag_number")
        .eq("id", input.bullId)
        .maybeSingle();
      sireTag = bull?.tag_number ?? null;
    }

    let damTag = input.damTag?.trim() || null;
    if (input.damId && !damTag) {
      const { data: dam } = await supabase
        .from("individual_animals")
        .select("tag_number")
        .eq("id", input.damId)
        .maybeSingle();
      damTag = dam?.tag_number ?? null;
    }

    const pregnancyStatus = input.pregnancyStatus ?? "bred";

    const { data, error } = await supabase
      .from("breeding_records")
      .insert({
        organization_id: orgId,
        bred_at: bredAt,
        breeding_context: context,
        cattle_group_id: input.cattleGroupId || null,
        cow_calf_herd_id: input.cowCalfHerdId || null,
        location_id: input.locationId || null,
        dam_id: input.damId || null,
        dam_tag: damTag,
        bull_id: input.bullId || null,
        sire_tag: sireTag,
        embryo_donor_tag: input.embryoDonorTag?.trim() || null,
        embryo_recipient_tag: input.embryoRecipientTag?.trim() || null,
        breeding_method: input.breedingMethod ?? (context === "seedstock" ? "ai" : "natural"),
        expected_calving_date:
          input.expectedCalvingDate?.trim() || expectedCalvingFromBredDate(bredAt),
        pregnancy_status: pregnancyStatus,
        pregnancy_check_date: input.pregnancyCheckDate || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    if (context === "cow_calf" && input.damId) {
      const reproStatus = pregnancyStatusToReproductiveStatus(pregnancyStatus);
      if (reproStatus) {
        await syncDamReproductiveStatus(supabase, orgId, input.damId, reproStatus);
      }
    }

    if (context === "cow_calf") {
      await logCowCalfActivity({
        organizationId: orgId,
        action: "breeding_recorded",
        summary: `Breeding recorded${damTag ? ` for dam ${damTag}` : ""}.`,
        herdId: input.cowCalfHerdId ?? null,
        animalId: input.damId ?? null,
        sourceTable: "breeding_records",
        sourceId: data.id,
        userId: user.id,
      });
    }

    revalidateBreeding(context);
    return { success: "Breeding recorded", breedingId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateBreeding(
  orgId: string,
  breedingId: string,
  input: {
    bredAt?: string;
    cowCalfHerdId?: string | null;
    locationId?: string | null;
    damId?: string | null;
    damTag?: string | null;
    bullId?: string | null;
    sireTag?: string | null;
    embryoDonorTag?: string | null;
    embryoRecipientTag?: string | null;
    breedingMethod?: BreedingMethod;
    expectedCalvingDate?: string | null;
    pregnancyStatus?: PregnancyStatus;
    pregnancyCheckDate?: string | null;
    notes?: string | null;
  },
): Promise<BreedingActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    const updates: BreedingUpdate = {};

    if (input.bredAt !== undefined) updates.bred_at = input.bredAt;
    if (input.cowCalfHerdId !== undefined) updates.cow_calf_herd_id = input.cowCalfHerdId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.damId !== undefined) updates.dam_id = input.damId;
    if (input.damTag !== undefined) updates.dam_tag = input.damTag;
    if (input.bullId !== undefined) updates.bull_id = input.bullId;
    if (input.sireTag !== undefined) updates.sire_tag = input.sireTag;
    if (input.embryoDonorTag !== undefined) updates.embryo_donor_tag = input.embryoDonorTag;
    if (input.embryoRecipientTag !== undefined) {
      updates.embryo_recipient_tag = input.embryoRecipientTag;
    }
    if (input.breedingMethod !== undefined) updates.breeding_method = input.breedingMethod;
    if (input.expectedCalvingDate !== undefined) {
      updates.expected_calving_date = input.expectedCalvingDate;
    }
    if (input.pregnancyStatus !== undefined) updates.pregnancy_status = input.pregnancyStatus;
    if (input.pregnancyCheckDate !== undefined) {
      updates.pregnancy_check_date = input.pregnancyCheckDate;
    }
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data: existing } = await supabase
      .from("breeding_records")
      .select("breeding_context, dam_id, cow_calf_herd_id")
      .eq("id", breedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const { error } = await supabase
      .from("breeding_records")
      .update(updates)
      .eq("id", breedingId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    const context = (existing?.breeding_context as BreedingContext) ?? "cow_calf";
    const damId = input.damId ?? existing?.dam_id;
    if (context === "cow_calf" && damId && input.pregnancyStatus !== undefined) {
      const reproStatus = pregnancyStatusToReproductiveStatus(input.pregnancyStatus);
      if (reproStatus) {
        await syncDamReproductiveStatus(supabase, orgId, damId, reproStatus);
      }
    }

    if (context === "cow_calf") {
      await logCowCalfActivity({
        organizationId: orgId,
        action: "breeding_updated",
        summary: "Breeding record updated.",
        herdId: input.cowCalfHerdId ?? existing?.cow_calf_herd_id ?? null,
        animalId: damId ?? null,
        sourceTable: "breeding_records",
        sourceId: breedingId,
        userId: user.id,
      });
    }

    revalidateBreeding(context);
    revalidatePath(`/cow-calf/breeding/${breedingId}`);
    revalidatePath(`/seedstock/breeding/${breedingId}`);
    return { success: "Breeding updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function recordPregnancyCheck(
  orgId: string,
  breedingId: string,
  input: {
    pregnancyStatus: PregnancyStatus;
    pregnancyCheckDate?: string;
    notes?: string;
  },
): Promise<BreedingActionState> {
  try {
    const { supabase, user } = await requireMember(orgId);
    const checkDate = input.pregnancyCheckDate ?? new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("breeding_records")
      .select("breeding_context, dam_id, dam_tag, cow_calf_herd_id, notes")
      .eq("id", breedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!existing) return { error: "Breeding record not found" };

    const mergedNotes = input.notes?.trim()
      ? [existing.notes, input.notes.trim()].filter(Boolean).join("\n")
      : existing.notes;

    const { error } = await supabase
      .from("breeding_records")
      .update({
        pregnancy_status: input.pregnancyStatus,
        pregnancy_check_date: checkDate,
        notes: mergedNotes,
      })
      .eq("id", breedingId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    const context = (existing.breeding_context as BreedingContext) ?? "cow_calf";
    if (context === "cow_calf" && existing.dam_id) {
      const reproStatus = pregnancyStatusToReproductiveStatus(input.pregnancyStatus);
      if (reproStatus) {
        await syncDamReproductiveStatus(supabase, orgId, existing.dam_id, reproStatus);
      }
    }

    if (context === "cow_calf") {
      await logCowCalfActivity({
        organizationId: orgId,
        action: "pregnancy_check",
        summary: `Pregnancy check recorded${existing.dam_tag ? ` for ${existing.dam_tag}` : ""}: ${input.pregnancyStatus}.`,
        herdId: existing.cow_calf_herd_id,
        animalId: existing.dam_id,
        sourceTable: "breeding_records",
        sourceId: breedingId,
        userId: user.id,
        details: { pregnancyStatus: input.pregnancyStatus, checkDate },
      });
    }

    revalidateBreeding(context);
    revalidatePath(`/cow-calf/breeding/${breedingId}`);
    return { success: "Pregnancy check recorded" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveBreeding(orgId: string, breedingId: string): Promise<BreedingActionState> {
  try {
    const { supabase } = await requireMember(orgId);

    const { data: existing } = await supabase
      .from("breeding_records")
      .select("breeding_context")
      .eq("id", breedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const { error } = await supabase
      .from("breeding_records")
      .update({ is_active: false })
      .eq("id", breedingId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateBreeding((existing?.breeding_context as BreedingContext) ?? "cow_calf");
    return { success: "Breeding archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
