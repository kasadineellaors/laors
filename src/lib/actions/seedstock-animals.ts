"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";
import type { AnimalStatus, SeedstockAnimalType } from "@/lib/seedstock/types";

type AnimalUpdate = Database["public"]["Tables"]["individual_animals"]["Update"];

export type SeedstockAnimalActionState = {
  error?: string;
  success?: string;
  animalId?: string;
};

const DB_HINT = "Run supabase/RUN_PHASE14.sql or supabase db push, then retry.";

function formatDbError(message: string): string {
  if (message.includes("individual_animals") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function revalidateSeedstock() {
  revalidatePath("/seedstock");
  revalidatePath("/seedstock/animals");
}

async function requireManager(orgId: string) {
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

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }
  return { supabase, user };
}

function parseEpd(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

export async function createSeedstockAnimal(
  orgId: string,
  input: {
    tagNumber: string;
    name?: string;
    registrationNumber?: string;
    animalType?: SeedstockAnimalType;
    breed?: string;
    birthDate?: string;
    sireTag?: string;
    damTag?: string;
    pedigree?: string;
    epdBirthWeight?: string;
    epdWeaningWeight?: string;
    epdYearlingWeight?: string;
    epdMilk?: string;
    epdCea?: string;
    epdDoc?: string;
    epdScrotal?: string;
    epdMarbling?: string;
    cattleGroupId?: string;
    locationId?: string;
    notes?: string;
  },
): Promise<SeedstockAnimalActionState> {
  const tag = input.tagNumber.trim();
  if (!tag) return { error: "Animal ID / tag is required" };

  const epdBw = parseEpd(input.epdBirthWeight);
  const epdWw = parseEpd(input.epdWeaningWeight);
  const epdYw = parseEpd(input.epdYearlingWeight);
  const epdMilk = parseEpd(input.epdMilk);
  const epdCea = parseEpd(input.epdCea);
  const epdDoc = parseEpd(input.epdDoc);
  const epdScrotal = parseEpd(input.epdScrotal);
  const epdMarbling = parseEpd(input.epdMarbling);
  if (input.epdBirthWeight?.trim() && epdBw === undefined) return { error: "Enter a valid birth weight EPD" };
  if (input.epdWeaningWeight?.trim() && epdWw === undefined) return { error: "Enter a valid weaning weight EPD" };
  if (input.epdYearlingWeight?.trim() && epdYw === undefined) return { error: "Enter a valid yearling weight EPD" };
  if (input.epdMilk?.trim() && epdMilk === undefined) return { error: "Enter a valid milk EPD" };
  if (input.epdCea?.trim() && epdCea === undefined) return { error: "Enter a valid CEA EPD" };
  if (input.epdDoc?.trim() && epdDoc === undefined) return { error: "Enter a valid DOC EPD" };
  if (input.epdScrotal?.trim() && epdScrotal === undefined) return { error: "Enter a valid scrotal EPD" };
  if (input.epdMarbling?.trim() && epdMarbling === undefined) return { error: "Enter a valid marbling EPD" };

  try {
    const { supabase, user } = await requireManager(orgId);
    const { data, error } = await supabase
      .from("individual_animals")
      .insert({
        organization_id: orgId,
        tag_number: tag,
        name: input.name?.trim() || null,
        registration_number: input.registrationNumber?.trim() || null,
        animal_type: input.animalType ?? "bull",
        registry_context: "seedstock",
        breed: input.breed?.trim() || null,
        birth_date: input.birthDate || null,
        sire_tag: input.sireTag?.trim() || null,
        dam_tag: input.damTag?.trim() || null,
        pedigree: input.pedigree?.trim() || null,
        epd_birth_weight: epdBw ?? null,
        epd_weaning_weight: epdWw ?? null,
        epd_yearling_weight: epdYw ?? null,
        epd_milk: epdMilk ?? null,
        epd_cea: epdCea ?? null,
        epd_doc: epdDoc ?? null,
        epd_scrotal: epdScrotal ?? null,
        epd_marbling: epdMarbling ?? null,
        cattle_group_id: input.cattleGroupId || null,
        location_id: input.locationId || null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) return { error: formatDbError(error.message) };
    revalidateSeedstock();
    return { success: "Animal registered", animalId: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateSeedstockAnimal(
  orgId: string,
  animalId: string,
  input: {
    tagNumber?: string;
    name?: string | null;
    registrationNumber?: string | null;
    animalType?: SeedstockAnimalType;
    breed?: string | null;
    birthDate?: string | null;
    sireTag?: string | null;
    damTag?: string | null;
    pedigree?: string | null;
    epdBirthWeight?: string | null;
    epdWeaningWeight?: string | null;
    epdYearlingWeight?: string | null;
    epdMilk?: string | null;
    epdCea?: string | null;
    epdDoc?: string | null;
    epdScrotal?: string | null;
    epdMarbling?: string | null;
    cattleGroupId?: string | null;
    locationId?: string | null;
    status?: AnimalStatus;
    notes?: string | null;
  },
): Promise<SeedstockAnimalActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const updates: AnimalUpdate = {};

    if (input.tagNumber !== undefined) {
      const tag = input.tagNumber.trim();
      if (!tag) return { error: "Animal ID / tag is required" };
      updates.tag_number = tag;
    }
    if (input.name !== undefined) updates.name = input.name?.trim() || null;
    if (input.registrationNumber !== undefined) {
      updates.registration_number = input.registrationNumber?.trim() || null;
    }
    if (input.animalType !== undefined) updates.animal_type = input.animalType;
    if (input.breed !== undefined) updates.breed = input.breed?.trim() || null;
    if (input.birthDate !== undefined) updates.birth_date = input.birthDate;
    if (input.sireTag !== undefined) updates.sire_tag = input.sireTag?.trim() || null;
    if (input.damTag !== undefined) updates.dam_tag = input.damTag?.trim() || null;
    if (input.pedigree !== undefined) updates.pedigree = input.pedigree?.trim() || null;
    if (input.cattleGroupId !== undefined) updates.cattle_group_id = input.cattleGroupId;
    if (input.locationId !== undefined) updates.location_id = input.locationId;
    if (input.status !== undefined) updates.status = input.status;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    if (input.epdBirthWeight !== undefined) {
      if (!input.epdBirthWeight?.trim()) updates.epd_birth_weight = null;
      else {
        const n = parseEpd(input.epdBirthWeight);
        if (n === undefined) return { error: "Enter a valid birth weight EPD" };
        updates.epd_birth_weight = n;
      }
    }
    if (input.epdWeaningWeight !== undefined) {
      if (!input.epdWeaningWeight?.trim()) updates.epd_weaning_weight = null;
      else {
        const n = parseEpd(input.epdWeaningWeight);
        if (n === undefined) return { error: "Enter a valid weaning weight EPD" };
        updates.epd_weaning_weight = n;
      }
    }
    if (input.epdYearlingWeight !== undefined) {
      if (!input.epdYearlingWeight?.trim()) updates.epd_yearling_weight = null;
      else {
        const n = parseEpd(input.epdYearlingWeight);
        if (n === undefined) return { error: "Enter a valid yearling weight EPD" };
        updates.epd_yearling_weight = n;
      }
    }
    if (input.epdMilk !== undefined) {
      if (!input.epdMilk?.trim()) updates.epd_milk = null;
      else {
        const n = parseEpd(input.epdMilk);
        if (n === undefined) return { error: "Enter a valid milk EPD" };
        updates.epd_milk = n;
      }
    }
    if (input.epdCea !== undefined) {
      if (!input.epdCea?.trim()) updates.epd_cea = null;
      else {
        const n = parseEpd(input.epdCea);
        if (n === undefined) return { error: "Enter a valid CEA EPD" };
        updates.epd_cea = n;
      }
    }
    if (input.epdDoc !== undefined) {
      if (!input.epdDoc?.trim()) updates.epd_doc = null;
      else {
        const n = parseEpd(input.epdDoc);
        if (n === undefined) return { error: "Enter a valid DOC EPD" };
        updates.epd_doc = n;
      }
    }
    if (input.epdScrotal !== undefined) {
      if (!input.epdScrotal?.trim()) updates.epd_scrotal = null;
      else {
        const n = parseEpd(input.epdScrotal);
        if (n === undefined) return { error: "Enter a valid scrotal EPD" };
        updates.epd_scrotal = n;
      }
    }
    if (input.epdMarbling !== undefined) {
      if (!input.epdMarbling?.trim()) updates.epd_marbling = null;
      else {
        const n = parseEpd(input.epdMarbling);
        if (n === undefined) return { error: "Enter a valid marbling EPD" };
        updates.epd_marbling = n;
      }
    }

    const { error } = await supabase
      .from("individual_animals")
      .update(updates)
      .eq("id", animalId)
      .eq("organization_id", orgId)
      .eq("registry_context", "seedstock");

    if (error) return { error: formatDbError(error.message) };
    revalidateSeedstock();
    revalidatePath(`/seedstock/animals/${animalId}`);
    return { success: "Animal updated" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveSeedstockAnimal(
  orgId: string,
  animalId: string,
): Promise<SeedstockAnimalActionState> {
  try {
    const { supabase } = await requireManager(orgId);
    const { error } = await supabase
      .from("individual_animals")
      .update({ is_active: false, status: "archived" })
      .eq("id", animalId)
      .eq("organization_id", orgId)
      .eq("registry_context", "seedstock");

    if (error) return { error: formatDbError(error.message) };
    revalidateSeedstock();
    return { success: "Animal archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
