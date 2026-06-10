import { createClient } from "@/lib/supabase/server";
import type { SeedstockAnimalRecord, SeedstockAnimalType, SeedstockSummary } from "./types";

const DB_HINT = "Run supabase/RUN_PHASE14.sql or supabase db push, then retry.";

function formatDbError(message: string): string {
  if (message.includes("individual_animals") || message.includes("schema cache")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

type AnimalRow = {
  id: string;
  tag_number: string;
  name: string | null;
  registration_number: string | null;
  animal_type: string;
  breed: string | null;
  birth_date: string | null;
  sire_tag: string | null;
  dam_tag: string | null;
  pedigree: string | null;
  epd_birth_weight: number | null;
  epd_weaning_weight: number | null;
  epd_yearling_weight: number | null;
  epd_milk: number | null;
  epd_cea: number | null;
  epd_doc: number | null;
  epd_scrotal: number | null;
  epd_marbling: number | null;
  epd_calving_ease: number | null;
  cattle_group_id: string | null;
  location_id: string | null;
  status: string;
  notes: string | null;
};

async function enrichAnimals(orgId: string, rows: AnimalRow[]): Promise<SeedstockAnimalRecord[]> {
  if (!rows.length) return [];
  const supabase = await createClient();

  const groupIds = [...new Set(rows.map((r) => r.cattle_group_id).filter(Boolean))] as string[];
  const locationIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))] as string[];

  const [{ data: groups }, { data: locations }] = await Promise.all([
    groupIds.length
      ? supabase.from("cattle_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const locMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  return rows.map((row) => ({
    id: row.id,
    tag_number: row.tag_number,
    name: row.name,
    registration_number: row.registration_number,
    animal_type: row.animal_type as SeedstockAnimalType,
    breed: row.breed,
    birth_date: row.birth_date,
    sire_tag: row.sire_tag,
    dam_tag: row.dam_tag,
    pedigree: row.pedigree,
    epd_birth_weight: row.epd_birth_weight != null ? Number(row.epd_birth_weight) : null,
    epd_weaning_weight: row.epd_weaning_weight != null ? Number(row.epd_weaning_weight) : null,
    epd_yearling_weight: row.epd_yearling_weight != null ? Number(row.epd_yearling_weight) : null,
    epd_milk: row.epd_milk != null ? Number(row.epd_milk) : null,
    epd_cea: row.epd_cea != null ? Number(row.epd_cea) : null,
    epd_doc: row.epd_doc != null ? Number(row.epd_doc) : null,
    epd_scrotal: row.epd_scrotal != null ? Number(row.epd_scrotal) : null,
    epd_marbling: row.epd_marbling != null ? Number(row.epd_marbling) : null,
    epd_calving_ease: row.epd_calving_ease != null ? Number(row.epd_calving_ease) : null,
    cattle_group_id: row.cattle_group_id,
    cattle_group_name: row.cattle_group_id ? groupMap.get(row.cattle_group_id) ?? null : null,
    location_id: row.location_id,
    location_name: row.location_id ? locMap.get(row.location_id) ?? null : null,
    status: row.status as SeedstockAnimalRecord["status"],
    notes: row.notes,
  }));
}

export async function listSeedstockAnimals(orgId: string): Promise<SeedstockAnimalRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("registry_context", "seedstock")
    .eq("is_active", true)
    .order("tag_number");

  if (error) throw new Error(formatDbError(error.message));
  return enrichAnimals(orgId, (data ?? []) as AnimalRow[]);
}

export async function getSeedstockAnimal(
  orgId: string,
  id: string,
): Promise<SeedstockAnimalRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("individual_animals")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("registry_context", "seedstock")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) return null;
  const [animal] = await enrichAnimals(orgId, [data as AnimalRow]);
  return animal ?? null;
}

export async function listSeedstockSireOptions(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("individual_animals")
    .select("id, tag_number, name")
    .eq("organization_id", orgId)
    .eq("registry_context", "seedstock")
    .eq("animal_type", "bull")
    .eq("status", "active")
    .eq("is_active", true)
    .order("tag_number");

  return (data ?? []).map((b) => ({
    value: b.id,
    label: b.name ? `${b.tag_number} — ${b.name}` : b.tag_number,
    tag: b.tag_number,
  }));
}

export async function listSeedstockDamOptions(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("individual_animals")
    .select("id, tag_number, name")
    .eq("organization_id", orgId)
    .eq("registry_context", "seedstock")
    .in("animal_type", ["cow", "heifer"])
    .eq("status", "active")
    .eq("is_active", true)
    .order("tag_number");

  return (data ?? []).map((d) => ({
    value: d.id,
    label: d.name ? `${d.tag_number} — ${d.name}` : d.tag_number,
    tag: d.tag_number,
  }));
}

export async function getSeedstockSummary(orgId: string): Promise<SeedstockSummary> {
  const animals = await listSeedstockAnimals(orgId);
  return {
    total: animals.length,
    active: animals.filter((a) => a.status === "active").length,
    bulls: animals.filter((a) => a.animal_type === "bull" && a.status === "active").length,
    females: animals.filter(
      (a) => ["cow", "heifer"].includes(a.animal_type) && a.status === "active",
    ).length,
  };
}
