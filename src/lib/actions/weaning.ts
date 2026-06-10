"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/permissions/roles";
import { revalidatePath } from "next/cache";

export type WeaningActionState = {
  error?: string;
  success?: string;
  weaningId?: string;
  calfAnimalId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE16.sql in Supabase SQL Editor, then retry.";

function revalidateWeaning() {
  revalidatePath("/seedstock/maternal");
  revalidatePath("/seedstock/calving");
  revalidatePath("/seedstock/weaning");
  revalidatePath("/seedstock/animals");
}

type CalvingRow = {
  id: string;
  calved_at: string;
  dam_id: string | null;
  dam_tag: string | null;
  bull_id: string | null;
  sire_tag: string | null;
  calf_tag: string | null;
  calf_sex: string;
  calf_id: string | null;
  location_id: string | null;
  cattle_group_id: string | null;
};

async function registerRetainedHeifer(
  orgId: string,
  userId: string,
  calving: CalvingRow,
  calfTag: string,
): Promise<{ calfId: string } | { error: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("individual_animals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("tag_number", calfTag)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("calving_records")
      .update({ calf_id: existing.id })
      .eq("id", calving.id)
      .eq("organization_id", orgId);
    return { calfId: existing.id };
  }

  const { data: animal, error } = await supabase
    .from("individual_animals")
    .insert({
      organization_id: orgId,
      tag_number: calfTag,
      animal_type: "heifer",
      registry_context: "seedstock",
      birth_date: calving.calved_at,
      dam_id: calving.dam_id,
      sire_id: calving.bull_id,
      dam_tag: calving.dam_tag,
      sire_tag: calving.sire_tag,
      location_id: calving.location_id,
      cattle_group_id: calving.cattle_group_id,
      status: "active",
      notes: `Registered from weaning (calving ${calving.id})`,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !animal) {
    return { error: `${error?.message ?? "Failed to register heifer"} — ${DB_HINT}` };
  }

  await supabase
    .from("calving_records")
    .update({ calf_id: animal.id })
    .eq("id", calving.id)
    .eq("organization_id", orgId);

  return { calfId: animal.id };
}

export async function createWeaning(
  orgId: string,
  input: {
    calvingRecordId?: string;
    damId?: string;
    calfId?: string;
    calfTag?: string;
    weanedAt?: string;
    weaningWeightLbs?: number;
    retainedAsHeifer?: boolean;
    notes?: string;
  },
): Promise<WeaningActionState> {
  let supabase: Awaited<ReturnType<typeof requireOrgMember>>["supabase"];
  let user: Awaited<ReturnType<typeof requireOrgMember>>["user"];

  try {
    const ctx = await requireOrgMember(orgId);
    supabase = ctx.supabase;
    user = ctx.user;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not authorized" };
  }

  let calving: CalvingRow | null = null;
  if (input.calvingRecordId) {
    const { data } = await supabase
      .from("calving_records")
      .select(
        "id, calved_at, dam_id, dam_tag, bull_id, sire_tag, calf_tag, calf_sex, calf_id, location_id, cattle_group_id",
      )
      .eq("id", input.calvingRecordId)
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();
    calving = (data as CalvingRow | null) ?? null;
    if (!calving) return { error: "Calving record not found" };
  }

  const calfTag = input.calfTag?.trim() || calving?.calf_tag?.trim() || "";
  let calfId = input.calfId || calving?.calf_id || null;
  const damId = input.damId || calving?.dam_id || null;

  if (input.retainedAsHeifer) {
    try {
      await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);
    } catch {
      return { error: "Only managers can register retained heifers" };
    }
    if (!calfTag) return { error: "Calf tag is required to register a retained heifer" };
    if (calving && calving.calf_sex === "bull_calf") {
      return { error: "Cannot retain a bull calf as a heifer — check calf sex on the calving record" };
    }
    if (calving) {
      const result = await registerRetainedHeifer(orgId, user.id, calving, calfTag);
      if ("error" in result) return { error: result.error };
      calfId = result.calfId;
    }
  }

  const { data, error } = await supabase
    .from("weaning_records")
    .insert({
      organization_id: orgId,
      calving_record_id: input.calvingRecordId || null,
      dam_id: damId,
      calf_id: calfId,
      calf_tag: calfTag || null,
      weaned_at: input.weanedAt ?? new Date().toISOString().slice(0, 10),
      weaning_weight_lbs: input.weaningWeightLbs ?? null,
      retained_as_heifer: Boolean(input.retainedAsHeifer),
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: `${error.message} — ${DB_HINT}` };

  revalidateWeaning();
  if (calfId) revalidatePath(`/seedstock/animals/${calfId}`);

  return {
    success: input.retainedAsHeifer
      ? "Weaning recorded and heifer added to registry"
      : "Weaning recorded",
    weaningId: data.id,
    calfAnimalId: calfId ?? undefined,
  };
}

export async function archiveWeaning(orgId: string, id: string): Promise<WeaningActionState> {
  let supabase: Awaited<ReturnType<typeof requireOrgMember>>["supabase"];
  try {
    const ctx = await requirePermission(orgId, PERMISSIONS.INVENTORY_WRITE);
    supabase = ctx.supabase;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not authorized" };
  }

  const { error } = await supabase
    .from("weaning_records")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidateWeaning();
  return { success: "Weaning archived" };
}
