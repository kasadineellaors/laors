"use server";

import { createClient } from "@/lib/supabase/server";
import { canWriteInventory } from "@/lib/auth/roles";
import { applyClassificationHeadDelta } from "@/lib/actions/inventory";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type {
  AssistanceType,
  CalvingContext,
  CalfSex,
  CalvingOutcome,
  LossCause,
} from "@/lib/cow-calf/types";

type CalvingUpdate = Database["public"]["Tables"]["calving_records"]["Update"];

export type CalvingActionState = {
  error?: string;
  success?: string;
  calvingId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE8.sql in Supabase SQL Editor, then retry.";

function formatDbError(message: string): string {
  if (message.includes("calving_records") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateCalving(context?: CalvingContext) {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/calving");
  revalidatePath("/dashboard");
  revalidatePath("/cattle");
  if (context === "seedstock") {
    revalidatePath("/seedstock");
    revalidatePath("/seedstock/calving");
    revalidatePath("/seedstock/maternal");
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
  return { supabase, user, member };
}

async function maybeAddCalfToInventory(
  orgId: string,
  groupId: string,
  classificationId: string,
  notes: string,
): Promise<CalvingActionState | null> {
  const result = await applyClassificationHeadDelta(
    orgId,
    groupId,
    classificationId,
    1,
    notes,
  );
  if (result.error) return { error: result.error };
  return null;
}

export async function createCalving(
  orgId: string,
  input: {
    calvedAt?: string;
    calvingContext?: CalvingContext;
    locationId?: string;
    cattleGroupId?: string;
    damId?: string;
    damTag?: string;
    bullId?: string;
    sireTag?: string;
    calfTag?: string;
    calfSex?: CalfSex;
    birthWeightLbs?: number;
    outcome?: CalvingOutcome;
    calvingEaseScore?: number;
    assistanceType?: AssistanceType;
    lossCause?: LossCause;
    breedingRecordId?: string;
    classificationId?: string;
    addToInventory?: boolean;
    notes?: string;
  },
): Promise<CalvingActionState> {
  try {
    const { supabase, user, member } = await requireMember(orgId);
    const outcome = input.outcome ?? "live";
    const wantsInventory =
      Boolean(input.addToInventory) &&
      outcome === "live" &&
      input.cattleGroupId &&
      input.classificationId;

    if (input.addToInventory && outcome === "live") {
      if (!canWriteInventory(member.system_role)) {
        return { error: "Only managers can add calves to herd inventory" };
      }
      if (!input.cattleGroupId || !input.classificationId) {
        return { error: "Select herd group and calf classification to add to inventory" };
      }
    }

    const context = input.calvingContext ?? "cow_calf";

    const { data, error } = await supabase
      .from("calving_records")
      .insert({
        organization_id: orgId,
        calved_at: input.calvedAt ?? new Date().toISOString().slice(0, 10),
        calving_context: context,
        location_id: input.locationId || null,
        cattle_group_id: input.cattleGroupId || null,
        dam_id: input.damId || null,
        dam_tag: input.damTag?.trim() || null,
        bull_id: input.bullId || null,
        sire_tag: input.sireTag?.trim() || null,
        calf_tag: input.calfTag?.trim() || null,
        calf_sex: input.calfSex ?? "unknown",
        birth_weight_lbs: input.birthWeightLbs ?? null,
        outcome,
        calving_ease_score: input.calvingEaseScore ?? null,
        assistance_type: input.assistanceType ?? null,
        loss_cause: input.outcome === "live" ? null : input.lossCause ?? null,
        breeding_record_id: input.breedingRecordId || null,
        classification_id: input.classificationId || null,
        add_to_inventory: Boolean(input.addToInventory),
        inventory_added: false,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) return { error: formatDbError(error?.message ?? "Failed to save") };

    if (wantsInventory && input.cattleGroupId && input.classificationId) {
      const invError = await maybeAddCalfToInventory(
        orgId,
        input.cattleGroupId,
        input.classificationId,
        `Calving record ${data.id}`,
      );
      if (invError) {
        await supabase.from("calving_records").delete().eq("id", data.id);
        return invError;
      }
      await supabase
        .from("calving_records")
        .update({ inventory_added: true })
        .eq("id", data.id);
    }

    revalidateCalving(context);
    return { success: "Calving recorded", calvingId: data.id };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function updateCalving(
  orgId: string,
  calvingId: string,
  input: {
    calvedAt?: string;
    locationId?: string | null;
    damId?: string | null;
    damTag?: string | null;
    bullId?: string | null;
    sireTag?: string | null;
    calfTag?: string | null;
    calfSex?: CalfSex;
    birthWeightLbs?: number | null;
    outcome?: CalvingOutcome;
    calvingEaseScore?: number | null;
    assistanceType?: AssistanceType | null;
    lossCause?: LossCause | null;
    notes?: string | null;
  },
): Promise<CalvingActionState> {
  try {
    await requireMember(orgId);
    const supabase = await createClient();

    const updates: CalvingUpdate = {};
    if (input.calvedAt !== undefined) updates.calved_at = input.calvedAt;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.damId !== undefined) updates.dam_id = input.damId;
    if (input.damTag !== undefined) updates.dam_tag = input.damTag;
    if (input.bullId !== undefined) updates.bull_id = input.bullId;
    if (input.sireTag !== undefined) updates.sire_tag = input.sireTag;
    if (input.calfTag !== undefined) updates.calf_tag = input.calfTag;
    if (input.calfSex !== undefined) updates.calf_sex = input.calfSex;
    if (input.birthWeightLbs !== undefined) updates.birth_weight_lbs = input.birthWeightLbs;
    if (input.outcome !== undefined) updates.outcome = input.outcome;
    if (input.calvingEaseScore !== undefined) updates.calving_ease_score = input.calvingEaseScore;
    if (input.assistanceType !== undefined) updates.assistance_type = input.assistanceType;
    if (input.lossCause !== undefined) updates.loss_cause = input.lossCause;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data: existing } = await supabase
      .from("calving_records")
      .select("calving_context")
      .eq("id", calvingId)
      .maybeSingle();

    const { error } = await supabase
      .from("calving_records")
      .update(updates)
      .eq("id", calvingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateCalving((existing?.calving_context as CalvingContext) ?? "cow_calf");
    return { success: "Calving updated" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}

export async function archiveCalving(orgId: string, calvingId: string): Promise<CalvingActionState> {
  try {
    const { supabase, member } = await requireMember(orgId);

    const { data: record } = await supabase
      .from("calving_records")
      .select("inventory_added, cattle_group_id, classification_id, outcome")
      .eq("id", calvingId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!record) return { error: "Calving record not found" };

    if (
      record.inventory_added &&
      record.outcome === "live" &&
      record.cattle_group_id &&
      record.classification_id
    ) {
      if (!canWriteInventory(member.system_role)) {
        return { error: "Only managers can archive calving that added inventory" };
      }
      const revert = await applyClassificationHeadDelta(
        orgId,
        record.cattle_group_id,
        record.classification_id,
        -1,
        `Archive calving ${calvingId}`,
      );
      if (revert.error) return { error: revert.error };
    }

    const { error } = await supabase
      .from("calving_records")
      .update({ is_active: false })
      .eq("id", calvingId)
      .eq("organization_id", orgId);

    if (error) return { error: formatDbError(error.message) };
    revalidateCalving();
    return { success: "Calving archived" };
  } catch (e) {
    return { error: formatDbError(e instanceof Error ? e.message : "Failed") };
  }
}
