import { createClient } from "@/lib/supabase/server";
import type { MaternalDataset } from "./types";

const DB_HINT = "Run supabase/RUN_PHASE16.sql or supabase db push, then retry.";

function formatDbError(message: string): string {
  if (message.includes("schema cache") || message.includes("does not exist")) {
    return `${message} — ${DB_HINT}`;
  }
  return message;
}

function isFemaleType(animalType: string): boolean {
  return animalType === "cow" || animalType === "heifer";
}

export async function loadMaternalDataset(orgId: string): Promise<MaternalDataset> {
  const supabase = await createClient();

  const [animalsRes, breedingRes, calvingRes, weaningRes, salesRes] = await Promise.all([
    supabase
      .from("individual_animals")
      .select(
        "id, tag_number, name, animal_type, birth_date, dam_id, sire_id, dam_tag, sire_tag, epd_calving_ease, epd_birth_weight, status",
      )
      .eq("organization_id", orgId)
      .eq("registry_context", "seedstock")
      .eq("is_active", true),
    supabase
      .from("breeding_records")
      .select(
        "id, bred_at, dam_id, dam_tag, bull_id, sire_tag, breeding_method, pregnancy_status, expected_calving_date, breeding_context",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("breeding_context", ["seedstock", "cow_calf"]),
    supabase
      .from("calving_records")
      .select(
        "id, calved_at, dam_id, dam_tag, bull_id, sire_tag, calf_tag, calf_sex, birth_weight_lbs, outcome, calving_context, calving_ease_score, assistance_type, loss_cause, breeding_record_id",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("weaning_records")
      .select(
        "id, calving_record_id, dam_id, calf_id, calf_tag, weaned_at, weaning_weight_lbs, retained_as_heifer",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("sales_records")
      .select("id, sale_date, individual_animal_id, total_amount, seedstock_sale_type, buyer_name")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  for (const res of [animalsRes, breedingRes, calvingRes, weaningRes, salesRes]) {
    if (res.error) throw new Error(formatDbError(res.error.message));
  }

  const animals = (animalsRes.data ?? []).map((a) => ({
    id: a.id as string,
    tag_number: a.tag_number as string,
    name: (a.name as string | null) ?? null,
    animal_type: a.animal_type as string,
    birth_date: (a.birth_date as string | null) ?? null,
    dam_id: (a.dam_id as string | null) ?? null,
    sire_id: (a.sire_id as string | null) ?? null,
    dam_tag: (a.dam_tag as string | null) ?? null,
    sire_tag: (a.sire_tag as string | null) ?? null,
    epd_calving_ease: a.epd_calving_ease != null ? Number(a.epd_calving_ease) : null,
    epd_birth_weight: a.epd_birth_weight != null ? Number(a.epd_birth_weight) : null,
    status: a.status as string,
  }));

  const femaleIds = new Set(
    animals.filter((a) => isFemaleType(a.animal_type)).map((a) => a.id),
  );
  const tagToFemaleId = new Map<string, string>();
  for (const a of animals) {
    if (isFemaleType(a.animal_type)) {
      tagToFemaleId.set(a.tag_number.toLowerCase(), a.id);
    }
  }

  const breeding = (breedingRes.data ?? []).map((r) => ({
    id: r.id as string,
    bred_at: r.bred_at as string,
    dam_id: (r.dam_id as string | null) ?? null,
    dam_tag: (r.dam_tag as string | null) ?? null,
    bull_id: (r.bull_id as string | null) ?? null,
    sire_tag: (r.sire_tag as string | null) ?? null,
    breeding_method: r.breeding_method as string,
    pregnancy_status: r.pregnancy_status as string,
    expected_calving_date: (r.expected_calving_date as string | null) ?? null,
    breeding_context: (r.breeding_context as string) ?? "cow_calf",
  }));

  const calving = (calvingRes.data ?? []).map((r) => ({
    id: r.id as string,
    calved_at: r.calved_at as string,
    dam_id: (r.dam_id as string | null) ?? null,
    dam_tag: (r.dam_tag as string | null) ?? null,
    bull_id: (r.bull_id as string | null) ?? null,
    sire_tag: (r.sire_tag as string | null) ?? null,
    calf_tag: (r.calf_tag as string | null) ?? null,
    calf_sex: r.calf_sex as string,
    birth_weight_lbs: r.birth_weight_lbs != null ? Number(r.birth_weight_lbs) : null,
    outcome: r.outcome as string,
    calving_context: (r.calving_context as string) ?? "cow_calf",
    calving_ease_score: r.calving_ease_score != null ? Number(r.calving_ease_score) : null,
    assistance_type: (r.assistance_type as MaternalDataset["calving"][0]["assistance_type"]) ?? null,
    loss_cause: (r.loss_cause as MaternalDataset["calving"][0]["loss_cause"]) ?? null,
    breeding_record_id: (r.breeding_record_id as string | null) ?? null,
  }));

  const weaning = (weaningRes.data ?? []).map((r) => ({
    id: r.id as string,
    calving_record_id: (r.calving_record_id as string | null) ?? null,
    dam_id: (r.dam_id as string | null) ?? null,
    calf_id: (r.calf_id as string | null) ?? null,
    calf_tag: (r.calf_tag as string | null) ?? null,
    weaned_at: r.weaned_at as string,
    weaning_weight_lbs: r.weaning_weight_lbs != null ? Number(r.weaning_weight_lbs) : null,
    retained_as_heifer: Boolean(r.retained_as_heifer),
  }));

  const sales = (salesRes.data ?? []).map((r) => ({
    id: r.id as string,
    sale_date: r.sale_date as string,
    individual_animal_id: (r.individual_animal_id as string | null) ?? null,
    total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    seedstock_sale_type: (r.seedstock_sale_type as string | null) ?? null,
    buyer_name: (r.buyer_name as string | null) ?? null,
  }));

  return { animals, breeding, calving, weaning, sales, femaleIds, tagToFemaleId };
}

/** Resolve dam_id from explicit FK or tag match. */
export function resolveDamId(
  dataset: MaternalDataset,
  damId: string | null,
  damTag: string | null,
): string | null {
  if (damId && dataset.femaleIds.has(damId)) return damId;
  if (damTag) {
    const match = dataset.tagToFemaleId.get(damTag.trim().toLowerCase());
    if (match) return match;
  }
  return damId && dataset.femaleIds.has(damId) ? damId : null;
}

export function getFemaleAnimals(dataset: MaternalDataset) {
  return dataset.animals.filter((a) => dataset.femaleIds.has(a.id));
}

export function calvingsForDam(dataset: MaternalDataset, damId: string) {
  return dataset.calving.filter((c) => resolveDamId(dataset, c.dam_id, c.dam_tag) === damId);
}

export function breedingForDam(dataset: MaternalDataset, damId: string) {
  const animal = dataset.animals.find((a) => a.id === damId);
  const tag = animal?.tag_number?.toLowerCase();
  return dataset.breeding.filter((b) => {
    const resolved = resolveDamId(dataset, b.dam_id, b.dam_tag);
    if (resolved === damId) return true;
    if (tag && b.dam_tag?.toLowerCase() === tag) return true;
    return false;
  });
}

export function weaningForDam(dataset: MaternalDataset, damId: string) {
  return dataset.weaning.filter((w) => w.dam_id === damId);
}

export function descendantsOf(dataset: MaternalDataset, damId: string) {
  const dam = dataset.animals.find((a) => a.id === damId);
  const damTag = dam?.tag_number?.toLowerCase();
  return dataset.animals.filter((a) => {
    if (a.dam_id === damId) return true;
    if (damTag && a.dam_tag?.toLowerCase() === damTag) return true;
    return false;
  });
}
