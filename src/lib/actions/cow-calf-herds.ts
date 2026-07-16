"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import type { AuthActionState } from "@/lib/actions/auth";

const herdSchema = z.object({
  name: z.string().min(1, "Herd name is required"),
  currentLocationId: z.string().optional(),
  ownerId: z.string().optional(),
  description: z.string().optional(),
  breedingSeason: z.string().optional(),
  calvingSeason: z.string().optional(),
  recordkeepingMode: z.enum(["individual", "group", "mixed"]).default("individual"),
  groupCowsCount: z.coerce.number().int().min(0).default(0),
  groupCalvesAtSideCount: z.coerce.number().int().min(0).default(0),
  groupBullsCount: z.coerce.number().int().min(0).default(0),
  groupReplacementsCount: z.coerce.number().int().min(0).default(0),
});

export async function createCowCalfHerd(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = herdSchema.safeParse({
    name: formData.get("name"),
    currentLocationId: formData.get("currentLocationId") || undefined,
    ownerId: formData.get("ownerId") || undefined,
    description: formData.get("description") || undefined,
    breedingSeason: formData.get("breedingSeason") || undefined,
    calvingSeason: formData.get("calvingSeason") || undefined,
    recordkeepingMode: formData.get("recordkeepingMode") || "individual",
    groupCowsCount: formData.get("groupCowsCount") || 0,
    groupCalvesAtSideCount: formData.get("groupCalvesAtSideCount") || 0,
    groupBullsCount: formData.get("groupBullsCount") || 0,
    groupReplacementsCount: formData.get("groupReplacementsCount") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const orgId = formData.get("organizationId");
  if (typeof orgId !== "string" || !orgId) {
    return { error: "Organization not found." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const d = parsed.data;
  const { data, error } = await supabase
    .from("cow_calf_herds")
    .insert({
      organization_id: orgId,
      name: d.name.trim(),
      current_location_id: d.currentLocationId || null,
      owner_id: d.ownerId || null,
      description: d.description?.trim() || null,
      breeding_season: d.breedingSeason?.trim() || null,
      calving_season: d.calvingSeason?.trim() || null,
      recordkeeping_mode: d.recordkeepingMode,
      group_cows_count: d.recordkeepingMode === "individual" ? 0 : d.groupCowsCount,
      group_calves_at_side_count: d.recordkeepingMode === "individual" ? 0 : d.groupCalvesAtSideCount,
      group_bulls_count: d.recordkeepingMode === "individual" ? 0 : d.groupBullsCount,
      group_replacements_count: d.recordkeepingMode === "individual" ? 0 : d.groupReplacementsCount,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logCowCalfActivity({
    organizationId: orgId,
    action: "herd_created",
    summary: `Herd "${d.name.trim()}" created.`,
    herdId: data.id,
    userId: user.id,
  });

  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/herds");
  redirect(`/cow-calf/herds/${data.id}`);
}

export async function moveCowCalfAnimals(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const orgId = formData.get("organizationId");
  const herdId = formData.get("herdId");
  const locationId = formData.get("locationId");
  const animalIds = formData.getAll("animalIds").filter((id): id is string => typeof id === "string");
  const moveEntireHerd = formData.get("moveEntireHerd") === "1";
  const movePairs = formData.get("movePairs") === "1";

  if (typeof orgId !== "string" || !orgId) return { error: "Organization not found." };
  if (typeof locationId !== "string" || !locationId) return { error: "Select a destination location." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  let idsToMove = animalIds;

  if (moveEntireHerd && typeof herdId === "string" && herdId) {
    const { data: herdAnimals, error } = await supabase
      .from("individual_animals")
      .select("id")
      .eq("organization_id", orgId)
      .eq("cow_calf_herd_id", herdId)
      .eq("registry_context", "cow_calf")
      .eq("is_active", true)
      .eq("status", "active");

    if (error) return { error: error.message };
    idsToMove = (herdAnimals ?? []).map((a) => a.id);
  }

  if (movePairs && idsToMove.length) {
    const { data: relationships, error: relError } = await supabase
      .from("dam_calf_relationships")
      .select("calf_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("nursing_status", "at_side")
      .in("dam_id", idsToMove);

    if (relError) return { error: relError.message };
    const calfIds = (relationships ?? []).map((r) => r.calf_id);
    idsToMove = [...new Set([...idsToMove, ...calfIds])];
  }

  if (!idsToMove.length) {
    return { error: "Select at least one animal to move." };
  }

  const { error: updateError } = await supabase
    .from("individual_animals")
    .update({ location_id: locationId })
    .eq("organization_id", orgId)
    .in("id", idsToMove);

  if (updateError) return { error: updateError.message };

  if (moveEntireHerd && typeof herdId === "string" && herdId) {
    await supabase
      .from("cow_calf_herds")
      .update({ current_location_id: locationId })
      .eq("organization_id", orgId)
      .eq("id", herdId);
  }

  await logCowCalfActivity({
    organizationId: orgId,
    action: "cattle_moved",
    summary: `Moved ${idsToMove.length} animal${idsToMove.length === 1 ? "" : "s"} to new location.`,
    herdId: typeof herdId === "string" ? herdId : null,
    userId: user.id,
    details: { animalIds: idsToMove, locationId, movePairs, moveEntireHerd },
  });

  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/herds");
  if (typeof herdId === "string") revalidatePath(`/cow-calf/herds/${herdId}`);
  return { success: `Moved ${idsToMove.length} animal${idsToMove.length === 1 ? "" : "s"}.` };
}
