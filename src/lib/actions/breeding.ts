"use server";

import { createClient } from "@/lib/supabase/server";
import { expectedCalvingFromBredDate } from "@/lib/cow-calf/constants";
import type {
  BreedingContext,
  BreedingMethod,
  PregnancyStatus,
} from "@/lib/cow-calf/breeding-types";
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

export async function createBreeding(
  orgId: string,
  input: {
    bredAt?: string;
    breedingContext?: BreedingContext;
    cattleGroupId?: string;
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

    const { data, error } = await supabase
      .from("breeding_records")
      .insert({
        organization_id: orgId,
        bred_at: bredAt,
        breeding_context: context,
        cattle_group_id: input.cattleGroupId || null,
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
        pregnancy_status: input.pregnancyStatus ?? "bred",
        pregnancy_check_date: input.pregnancyCheckDate || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };
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
    const { supabase } = await requireMember(orgId);
    const updates: BreedingUpdate = {};

    if (input.bredAt !== undefined) updates.bred_at = input.bredAt;
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
      .select("breeding_context")
      .eq("id", breedingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const { error } = await supabase
      .from("breeding_records")
      .update(updates)
      .eq("id", breedingId)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateBreeding((existing?.breeding_context as BreedingContext) ?? "cow_calf");
    revalidatePath(`/cow-calf/breeding/${breedingId}`);
    revalidatePath(`/seedstock/breeding/${breedingId}`);
    return { success: "Breeding updated" };
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
