"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/permissions/roles";

export type ExposureActionState = { error?: string; success?: string; exposureId?: string };

const DB_HINT = "Run supabase/RUN_PHASE16.sql in Supabase SQL Editor, then retry.";

function revalidateExposure() {
  revalidatePath("/seedstock/exposure");
  revalidatePath("/seedstock/maternal");
}

export async function createExposure(
  orgId: string,
  input: {
    damId?: string;
    damTag?: string;
    bullId?: string;
    sireTag?: string;
    exposureStart: string;
    exposureEnd?: string;
    locationId?: string;
    notes?: string;
  },
): Promise<ExposureActionState> {
  try {
    const { supabase, user } = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);

    const { data, error } = await supabase
      .from("exposure_records")
      .insert({
        organization_id: orgId,
        breeding_context: "seedstock",
        dam_id: input.damId || null,
        dam_tag: input.damTag?.trim() || null,
        bull_id: input.bullId || null,
        sire_tag: input.sireTag?.trim() || null,
        exposure_start: input.exposureStart,
        exposure_end: input.exposureEnd || null,
        location_id: input.locationId || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: `${error.message} — ${DB_HINT}` };
    revalidateExposure();
    return { success: "Exposure recorded", exposureId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveExposure(orgId: string, id: string): Promise<ExposureActionState> {
  try {
    const { supabase } = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);

    const { error } = await supabase
      .from("exposure_records")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateExposure();
    return { success: "Exposure archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
