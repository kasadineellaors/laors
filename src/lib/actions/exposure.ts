"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/permissions/roles";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import {
  findOverlappingBullExposures,
} from "@/lib/cow-calf/reproduction-helpers";
import { listActiveBullExposureWindows } from "@/lib/cow-calf/breeding-queries";
import type { Database } from "@/types/database";

type ExposureUpdate = Database["public"]["Tables"]["exposure_records"]["Update"];

export type ExposureActionState = {
  error?: string;
  success?: string;
  exposureId?: string;
  warning?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE16.sql in Supabase SQL Editor, then retry.";

type BreedingContext = "seedstock" | "cow_calf";

function revalidateExposure(context: BreedingContext = "seedstock") {
  if (context === "cow_calf") {
    revalidatePath("/cow-calf");
    revalidatePath("/cow-calf/breeding");
    revalidatePath("/cow-calf/exposure");
  } else {
    revalidatePath("/seedstock/exposure");
    revalidatePath("/seedstock/maternal");
  }
}

export async function createExposure(
  orgId: string,
  input: {
    breedingContext?: BreedingContext;
    cowCalfHerdId?: string;
    exposedCowCount?: number;
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
  const context = input.breedingContext ?? "seedstock";
  try {
    const { supabase, user } = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);

    let warning: string | undefined;
    if (context === "cow_calf" && input.bullId) {
      const active = await listActiveBullExposureWindows(orgId, "cow_calf");
      const overlaps = findOverlappingBullExposures(active, {
        id: "new",
        bullId: input.bullId,
        damId: input.damId ?? null,
        exposureStart: input.exposureStart,
        exposureEnd: input.exposureEnd ?? null,
      });
      if (overlaps.length) {
        warning =
          "This bull has another active exposure window that overlaps these dates. Confirm turn-in/pull dates.";
      }
    }

    const { data, error } = await supabase
      .from("exposure_records")
      .insert({
        organization_id: orgId,
        breeding_context: context,
        cow_calf_herd_id: input.cowCalfHerdId || null,
        exposed_cow_count: input.exposedCowCount ?? null,
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

    if (context === "cow_calf" && input.damId) {
      await supabase
        .from("individual_animals")
        .update({ reproductive_status: "exposed" })
        .eq("id", input.damId)
        .eq("organization_id", orgId);
    }

    if (context === "cow_calf") {
      await logCowCalfActivity({
        organizationId: orgId,
        action: "bull_exposure",
        summary: input.damId
          ? `Bull exposure recorded for dam ${input.damTag ?? "cow"}.`
          : `Herd bull turn-in recorded${input.exposedCowCount ? ` (${input.exposedCowCount} cows)` : ""}.`,
        herdId: input.cowCalfHerdId ?? null,
        animalId: input.damId ?? null,
        sourceTable: "exposure_records",
        sourceId: data.id,
        userId: user.id,
      });
    }

    revalidateExposure(context);
    return {
      success: "Exposure recorded",
      exposureId: data.id,
      warning,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateExposure(
  orgId: string,
  id: string,
  input: {
    exposureEnd?: string | null;
    notes?: string | null;
    exposedCowCount?: number | null;
  },
): Promise<ExposureActionState> {
  try {
    const { supabase, user } = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);

    const { data: existing } = await supabase
      .from("exposure_records")
      .select("breeding_context, cow_calf_herd_id, dam_id, dam_tag")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!existing) return { error: "Exposure record not found" };

    const updates: ExposureUpdate = {};
    if (input.exposureEnd !== undefined) updates.exposure_end = input.exposureEnd;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.exposedCowCount !== undefined) updates.exposed_cow_count = input.exposedCowCount;

    const { error } = await supabase
      .from("exposure_records")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: `${error.message} — ${DB_HINT}` };

    const context = (existing.breeding_context as BreedingContext) ?? "seedstock";
    if (context === "cow_calf" && input.exposureEnd) {
      await logCowCalfActivity({
        organizationId: orgId,
        action: "bull_pull",
        summary: `Bull pulled${existing.dam_tag ? ` from ${existing.dam_tag}` : ""} on ${input.exposureEnd}.`,
        herdId: existing.cow_calf_herd_id,
        animalId: existing.dam_id,
        sourceTable: "exposure_records",
        sourceId: id,
        userId: user.id,
      });
    }

    revalidateExposure(context);
    revalidatePath(`/cow-calf/exposure/${id}`);
    return { success: input.exposureEnd ? "Bull pull recorded" : "Exposure updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveExposure(orgId: string, id: string): Promise<ExposureActionState> {
  try {
    const { supabase } = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);

    const { data: existing } = await supabase
      .from("exposure_records")
      .select("breeding_context")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    const { error } = await supabase
      .from("exposure_records")
      .update({ is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
    revalidateExposure((existing?.breeding_context as BreedingContext) ?? "seedstock");
    return { success: "Exposure archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
