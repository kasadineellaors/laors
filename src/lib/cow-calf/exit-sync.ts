import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** End active nursing links for a calf and optionally sync dam status. */
export async function endNursingForCalf(
  supabase: SupabaseClient,
  orgId: string,
  calfId: string,
  weaningDate: string,
) {
  const { data: rels } = await supabase
    .from("dam_calf_relationships")
    .select("id, dam_id")
    .eq("organization_id", orgId)
    .eq("calf_id", calfId)
    .eq("is_active", true)
    .eq("nursing_status", "at_side");

  if (!rels?.length) return;

  const damIds = [...new Set(rels.map((r) => r.dam_id).filter(Boolean))] as string[];

  await supabase
    .from("dam_calf_relationships")
    .update({
      nursing_status: "weaned",
      relationship_status: "weaned",
      weaning_date: weaningDate,
    })
    .eq("organization_id", orgId)
    .eq("calf_id", calfId)
    .eq("is_active", true)
    .eq("nursing_status", "at_side");

  for (const damId of damIds) {
    await syncDamAfterCalfRemoved(supabase, orgId, damId);
  }
}

/** Set dam to dry when no calves remain at side; otherwise keep nursing. */
export async function syncDamAfterCalfRemoved(
  supabase: SupabaseClient,
  orgId: string,
  damId: string,
) {
  const { count } = await supabase
    .from("dam_calf_relationships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("dam_id", damId)
    .eq("is_active", true)
    .eq("nursing_status", "at_side");

  const status = (count ?? 0) > 0 ? "nursing" : "dry";
  await supabase
    .from("individual_animals")
    .update({ reproductive_status: status })
    .eq("id", damId)
    .eq("organization_id", orgId);
}

export async function markAnimalDeceased(
  supabase: SupabaseClient,
  orgId: string,
  animalId: string,
  animalType: string,
) {
  const updates: Record<string, string> = { status: "dead" };
  if (animalType === "other") {
    updates.calf_lifecycle_status = "deceased";
  } else if (animalType === "cow" || animalType === "heifer") {
    updates.reproductive_status = "deceased";
  }

  await supabase
    .from("individual_animals")
    .update(updates)
    .eq("id", animalId)
    .eq("organization_id", orgId);

  await endNursingRelationshipsAsEnded(supabase, orgId, animalId);
}

async function endNursingRelationshipsAsEnded(
  supabase: SupabaseClient,
  orgId: string,
  animalId: string,
) {
  await supabase
    .from("dam_calf_relationships")
    .update({ nursing_status: "ended", relationship_status: "ended" })
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .or(`dam_id.eq.${animalId},calf_id.eq.${animalId}`);
}

export async function markAnimalSold(
  supabase: SupabaseClient,
  orgId: string,
  animalId: string,
  animalType: string,
) {
  const updates: Record<string, string> = { status: "sold" };
  if (animalType === "other") {
    updates.calf_lifecycle_status = "sold";
  } else if (animalType === "cow" || animalType === "heifer") {
    updates.reproductive_status = "sold";
  }

  await supabase
    .from("individual_animals")
    .update(updates)
    .eq("id", animalId)
    .eq("organization_id", orgId);

  const { data: calf } = await supabase
    .from("individual_animals")
    .select("animal_type")
    .eq("id", animalId)
    .maybeSingle();

  if (calf?.animal_type === "other") {
    await endNursingForCalf(supabase, orgId, animalId, new Date().toISOString().slice(0, 10));
  }
}
