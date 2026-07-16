"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import { createTreatment } from "@/lib/actions/health";
import type { ProcessingEventType } from "@/lib/cow-calf/processing-types";

export type ProcessingActionState = {
  error?: string;
  success?: string;
  eventId?: string;
};

const DB_HINT = "Run supabase db push for Phase 37, then retry.";

function revalidateProcessing() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/processing");
  revalidatePath("/cow-calf/calves");
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

export async function createCowCalfProcessingEvent(
  orgId: string,
  input: {
    eventType: ProcessingEventType;
    processedAt?: string;
    cowCalfHerdId?: string;
    locationId?: string;
    productName?: string;
    notes?: string;
    calfIds: string[];
    weights?: Record<string, number>;
    medicineItemId?: string;
    quantityPerHead?: number;
    recordTreatment?: boolean;
  },
): Promise<ProcessingActionState> {
  if (!input.calfIds.length) return { error: "Select at least one calf" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const processedAt = input.processedAt ?? new Date().toISOString().slice(0, 10);

    const { data: event, error: eventError } = await supabase
      .from("cow_calf_processing_events")
      .insert({
        organization_id: orgId,
        cow_calf_herd_id: input.cowCalfHerdId || null,
        event_type: input.eventType,
        processed_at: processedAt,
        location_id: input.locationId || null,
        product_name: input.productName?.trim() || null,
        head_count: input.calfIds.length,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (eventError) return { error: `${eventError.message} — ${DB_HINT}` };

    let treatmentId: string | null = null;
    if (input.recordTreatment && input.productName?.trim()) {
      const treatment = await createTreatment(orgId, {
        productName: input.productName,
        treatmentType: input.eventType,
        headCount: input.calfIds.length,
        treatmentDate: processedAt,
        locationId: input.locationId,
        medicineItemId: input.medicineItemId,
        quantityUsed: input.quantityPerHead
          ? input.quantityPerHead * input.calfIds.length
          : undefined,
        notes: `Cow-calf processing event ${event.id}`,
      });
      if (treatment.error) return { error: treatment.error };
      treatmentId = treatment.treatmentId ?? null;
    }

    const lines = input.calfIds.map((calfId) => ({
      organization_id: orgId,
      processing_event_id: event.id,
      calf_id: calfId,
      weight_lbs: input.weights?.[calfId] ?? null,
      treatment_record_id: treatmentId,
    }));

    const { error: linesError } = await supabase.from("cow_calf_processing_lines").insert(lines);
    if (linesError) return { error: `${linesError.message} — ${DB_HINT}` };

    if (input.eventType === "castration") {
      await supabase
        .from("individual_animals")
        .update({ sex: "male" })
        .in("id", input.calfIds)
        .eq("organization_id", orgId);
    }

    await logCowCalfActivity({
      organizationId: orgId,
      action: "calf_processing",
      summary: `${input.eventType.replace(/_/g, " ")} recorded for ${input.calfIds.length} calf${input.calfIds.length === 1 ? "" : "ves"}.`,
      herdId: input.cowCalfHerdId ?? null,
      sourceTable: "cow_calf_processing_events",
      sourceId: event.id,
      userId: user.id,
      details: { eventType: input.eventType, calfCount: input.calfIds.length },
    });

    revalidateProcessing();
    return { success: "Processing recorded", eventId: event.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
