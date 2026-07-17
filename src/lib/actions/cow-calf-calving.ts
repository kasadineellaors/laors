"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import {
  calfSexToAnimalSex,
  inferTwinStatus,
} from "@/lib/cow-calf/calving-alerts";
import { reserveGenericCalfTags } from "@/lib/cow-calf/tag-generation";
import type {
  AssistanceType,
  CalfSex,
  CalvingOutcome,
  LossCause,
} from "@/lib/cow-calf/types";

export type CowCalfCalvingActionState = {
  error?: string;
  success?: string;
  calvingEventId?: string;
  calvingIds?: string[];
};

const DB_HINT = "Run supabase db push for Phase 37, then retry.";

function revalidateCowCalfCalving() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/calving");
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

type CalfInput = {
  calfTag?: string;
  calfSex?: CalfSex;
  birthWeightLbs?: number;
  outcome?: CalvingOutcome;
  earTag?: string;
  eid?: string;
};

export async function saveCowCalfCalving(
  orgId: string,
  input: {
    calvedAt?: string;
    cowCalfHerdId?: string;
    locationId?: string;
    damId: string;
    bullId?: string;
    sireTag?: string;
    breedingRecordId?: string;
    calvingEaseScore?: number;
    assistanceType?: AssistanceType;
    lossCause?: LossCause;
    fostered?: boolean;
    notes?: string;
    calves: CalfInput[];
  },
): Promise<CowCalfCalvingActionState> {
  if (!input.damId) return { error: "Select a dam" };
  if (!input.calves.length) return { error: "Add at least one calf" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const calvedAt = input.calvedAt ?? new Date().toISOString().slice(0, 10);
    const calvingEventId = randomUUID();
    const twinStatus = inferTwinStatus(input.calves.length);

    const { data: dam } = await supabase
      .from("individual_animals")
      .select("id, tag_number, cow_calf_herd_id, location_id")
      .eq("id", input.damId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!dam) return { error: "Dam not found" };

    const herdId = input.cowCalfHerdId || dam.cow_calf_herd_id || null;
    const damTag = dam.tag_number;
    let sireTag = input.sireTag?.trim() || null;

    if (input.bullId && !sireTag) {
      const { data: bull } = await supabase
        .from("individual_animals")
        .select("tag_number")
        .eq("id", input.bullId)
        .maybeSingle();
      sireTag = bull?.tag_number ?? null;
    }

    const calvingIds: string[] = [];
    let anyLiveAtSide = false;
    const autoCalfTags = await reserveGenericCalfTags(
      supabase,
      orgId,
      input.calves.length,
    );

    for (let i = 0; i < input.calves.length; i++) {
      const calf = input.calves[i];
      const outcome = calf.outcome ?? "live";
      const calfSex = calf.calfSex ?? "unknown";
      const calfTag = calf.calfTag?.trim() || autoCalfTags[i];

      let calfId: string | null = null;

      if (outcome === "live" || outcome === "died") {
        const { data: calfAnimal, error: calfError } = await supabase
          .from("individual_animals")
          .insert({
            organization_id: orgId,
            tag_number: calfTag,
            animal_type: "other",
            registry_context: "cow_calf",
            dam_id: input.damId,
            sire_tag: sireTag,
            cow_calf_herd_id: herdId,
            location_id: input.locationId || dam.location_id || null,
            birth_date: calvedAt,
            sex: calfSexToAnimalSex(calfSex),
            calf_lifecycle_status: outcome === "live" ? "at_side" : "deceased",
            ear_tag: calf.earTag?.trim() || null,
            eid: calf.eid?.trim() || null,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (calfError) return { error: `${calfError.message} — ${DB_HINT}` };
        calfId = calfAnimal.id;
      }

      const { data: calvingRow, error: calvingError } = await supabase
        .from("calving_records")
        .insert({
          organization_id: orgId,
          calved_at: calvedAt,
          calving_context: "cow_calf",
          cow_calf_herd_id: herdId,
          location_id: input.locationId || dam.location_id || null,
          dam_id: input.damId,
          dam_tag: damTag,
          bull_id: input.bullId || null,
          sire_tag: sireTag,
          calf_id: calfId,
          calf_tag: calfTag,
          calf_sex: calfSex,
          birth_weight_lbs: calf.birthWeightLbs ?? null,
          outcome,
          calving_ease_score: input.calvingEaseScore ?? null,
          assistance_type: input.assistanceType ?? null,
          loss_cause: outcome === "live" ? null : input.lossCause ?? null,
          breeding_record_id: input.breedingRecordId || null,
          calving_event_id: calvingEventId,
          twin_status: twinStatus,
          fostered: Boolean(input.fostered),
          add_to_inventory: false,
          inventory_added: false,
          notes: input.notes?.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (calvingError || !calvingRow) {
        return { error: `${calvingError?.message ?? "Failed"} — ${DB_HINT}` };
      }

      calvingIds.push(calvingRow.id);

      if (outcome === "live" && calfId && !input.fostered) {
        anyLiveAtSide = true;
        const { error: relError } = await supabase.from("dam_calf_relationships").insert({
          organization_id: orgId,
          dam_id: input.damId,
          calf_id: calfId,
          birth_date: calvedAt,
          relationship_status: "nursing",
          nursing_status: "at_side",
          fostered: false,
          calving_record_id: calvingRow.id,
          created_by: user.id,
        });
        if (relError) return { error: `${relError.message} — ${DB_HINT}` };
      }
    }

    if (anyLiveAtSide) {
      await supabase
        .from("individual_animals")
        .update({ reproductive_status: "nursing" })
        .eq("id", input.damId)
        .eq("organization_id", orgId);
    }

    if (input.breedingRecordId) {
      await supabase
        .from("breeding_records")
        .update({ pregnancy_status: "confirmed" })
        .eq("id", input.breedingRecordId)
        .eq("organization_id", orgId);
    } else {
      const { data: openBreeding } = await supabase
        .from("breeding_records")
        .select("id")
        .eq("organization_id", orgId)
        .eq("dam_id", input.damId)
        .eq("breeding_context", "cow_calf")
        .eq("is_active", true)
        .in("pregnancy_status", ["bred", "confirmed"])
        .order("bred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openBreeding?.id) {
        await supabase
          .from("breeding_records")
          .update({ pregnancy_status: "confirmed" })
          .eq("id", openBreeding.id);
      }
    }

    await logCowCalfActivity({
      organizationId: orgId,
      action: "calving_recorded",
      summary: `Calving recorded for ${damTag}${input.calves.length > 1 ? ` (${twinStatus})` : ""}.`,
      herdId,
      animalId: input.damId,
      sourceTable: "calving_records",
      sourceId: calvingIds[0],
      userId: user.id,
      details: { calvingEventId, calfCount: input.calves.length },
    });

    revalidateCowCalfCalving();
    return {
      success: "Calving recorded",
      calvingEventId,
      calvingIds,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function listOpenBreedingForDam(orgId: string, damId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("breeding_records")
    .select("id, bred_at, expected_calving_date, sire_tag")
    .eq("organization_id", orgId)
    .eq("dam_id", damId)
    .eq("breeding_context", "cow_calf")
    .eq("is_active", true)
    .in("pregnancy_status", ["bred", "confirmed"])
    .order("bred_at", { ascending: false });

  return (data ?? []).map((b) => ({
    value: b.id,
    label: `Bred ${b.bred_at}${b.expected_calving_date ? ` · due ${b.expected_calving_date}` : ""}`,
    sireTag: b.sire_tag,
  }));
}
